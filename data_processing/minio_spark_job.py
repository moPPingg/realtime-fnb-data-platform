import os
from pyspark.sql import SparkSession
from pyspark.sql.window import Window
import pyspark.sql.functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, TimestampType

# =============================================================================
# F&B DATA LAKE BATCH PROCESSING JOB (MINIO -> SPARK -> POSTGRES)
# =============================================================================

def get_spark_session():
    return SparkSession.builder \
        .appName("FnB_DataLake_ML_Feature_Pipeline") \
        .config("spark.hadoop.fs.s3a.endpoint", "http://localhost:9000") \
        .config("spark.hadoop.fs.s3a.access.key", "minioadmin") \
        .config("spark.hadoop.fs.s3a.secret.key", "minioadmin") \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
        .config("spark.jars.packages", "org.apache.hadoop:hadoop-aws:3.3.4,org.postgresql:postgresql:42.5.4") \
        .getOrCreate()

def run_pipeline():
    spark = get_spark_session()
    
    # -------------------------------------------------------------------------
    # 1. EXTRACT: Read Raw Data from MinIO (Bronze Zone)
    # -------------------------------------------------------------------------
    print("[INFO] Reading raw POS transactions from MinIO Data Lake...")
    # Using JSON format assuming raw streaming events land as JSON. 
    # (If the bucket is empty, this will throw an error in real execution, so we create a mock DataFrame for demonstration)
    try:
        raw_df = spark.read.format("json").load("s3a://fnb-datalake/raw/pos_transactions/")
    except Exception as e:
        print("[WARNING] MinIO not reachable or bucket empty. Using mock DataFrame to demonstrate pipeline execution.")
        # Mock Data matching the JSON structure of raw transactions
        mock_data = [
            ("txn_1", 1, 3, 2, 10.50, "2026-04-20 12:30:00"),
            ("txn_1", 1, 3, 2, 10.50, "2026-04-20 12:30:00"), # Duplicate to demonstrate deduplication
            ("txn_2", 1, 5, 1, 5.00,  "2026-04-21 13:00:00"),
            ("txn_3", 2, 3, 4, 21.00, "2026-04-22 19:15:00"),
            ("txn_4", 1, 3, 5, 26.25, "2026-04-23 12:00:00"),
            ("txn_5", 1, 3, 1, 5.25,  "2026-04-24 18:45:00"),
            ("txn_6", 1, 3, 2, 10.50, "2026-04-25 12:10:00"),
            ("txn_7", 1, 3, 6, 31.50, "2026-04-26 19:30:00")
        ]
        schema = StructType([
            StructField("transaction_id", StringType(), True),
            StructField("branch_id", IntegerType(), True),
            StructField("product_id", IntegerType(), True),
            StructField("quantity", IntegerType(), True),
            StructField("total_price", DoubleType(), True),
            StructField("timestamp_str", StringType(), True)
        ])
        raw_df = spark.createDataFrame(mock_data, schema)
    
    # -------------------------------------------------------------------------
    # 2. TRANSFORM: Data Cleaning & Deduplication
    # -------------------------------------------------------------------------
    print("[INFO] Cleaning and deduplicating raw data...")
    clean_df = raw_df.dropDuplicates(["transaction_id"]) \
                     .filter(F.col("total_price") > 0) \
                     .withColumn("timestamp", F.to_timestamp("timestamp_str")) \
                     .withColumn("date", F.to_date("timestamp"))
                     
    # -------------------------------------------------------------------------
    # 3. TRANSFORM: Daily Aggregations (Silver Zone Preparation)
    # -------------------------------------------------------------------------
    print("[INFO] Aggregating daily sales per branch and product...")
    sales_agg = clean_df.groupBy("date", "branch_id", "product_id") \
                        .agg(
                            F.sum("quantity").alias("daily_quantity"),
                            F.sum("total_price").alias("daily_revenue"),
                            F.count("transaction_id").alias("transaction_count")
                        )

    # Note: In a real environment, we would write this back to MinIO (Silver Zone)
    # sales_agg.write.mode("overwrite").partitionBy("date").parquet("s3a://fnb-datalake/processed/sales/")
    
    # -------------------------------------------------------------------------
    # 4. TRANSFORM: Feature Engineering for Machine Learning (Gold Zone)
    # -------------------------------------------------------------------------
    print("[INFO] Engineering ML Features (Rolling Windows & Trends)...")
    
    # Define Window: Partition by branch & product, ordered by date, spanning the previous 6 days + current day (7 days total)
    # To use rowsBetween correctly with dates, we ideally use unix_timestamp, but for sequential dense data rowsBetween(-6,0) works.
    # For sparse dates, rangeBetween on days is preferred. We use rowsBetween for demonstration.
    window_7d = Window.partitionBy("branch_id", "product_id").orderBy("date").rowsBetween(-6, Window.currentRow)
    window_branch = Window.partitionBy("branch_id")
    
    ml_features = sales_agg.withColumn("rolling_7d_sales", F.sum("daily_revenue").over(window_7d)) \
                           .withColumn("rolling_7d_qty", F.sum("daily_quantity").over(window_7d)) \
                           .withColumn("popularity_trend_score", F.col("rolling_7d_qty") / 7.0) \
                           .withColumn("branch_demand_index", F.col("transaction_count") / F.avg("transaction_count").over(window_branch)) \
                           .select(
                               F.col("date").alias("feature_date"),
                               "branch_id",
                               "product_id",
                               F.round("rolling_7d_sales", 2).alias("rolling_7d_sales"),
                               F.round("popularity_trend_score", 4).alias("popularity_trend_score"),
                               F.round("branch_demand_index", 4).alias("branch_demand_index")
                           )
    
    ml_features.show(truncate=False)

    # Note: In a real environment, write to Data Lake Gold Zone
    # ml_features.write.mode("overwrite").parquet("s3a://fnb-datalake/features/ml/")
    
    # -------------------------------------------------------------------------
    # 5. LOAD: Push Features to PostgreSQL Serving Layer (Supabase)
    # -------------------------------------------------------------------------
    print("[INFO] Pushing ML Features to PostgreSQL Serving Layer...")
    
    DB_URL = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
    DB_PROPERTIES = {
        "user": "postgres.bgicsxftnryxyrfbvprt",
        "password": "thienkhoi5@", # Password will be securely managed in production
        "driver": "org.postgresql.Driver"
    }

    try:
        # We append the data. In production, this would be an UPSERT (which requires custom JDBC dialect or temp tables)
        ml_features.write.jdbc(url=DB_URL, table="ml.ml_features", mode="append", properties=DB_PROPERTIES)
        print("[SUCCESS] Pipeline completed successfully. Features stored in Supabase.")
    except Exception as e:
        print(f"[WARNING] Could not connect to Supabase via JDBC (driver might not be present locally): {e}")
        print("[INFO] Run this script inside the PySpark container to execute the JDBC connection.")

if __name__ == "__main__":
    run_pipeline()
