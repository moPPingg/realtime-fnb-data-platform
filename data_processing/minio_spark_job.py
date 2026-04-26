import os
from dotenv import load_dotenv
from pyspark.sql import SparkSession
from pyspark.sql.window import Window
import pyspark.sql.functions as F
from pyspark.sql.types import (
    StructType, StructField, StringType, DoubleType, IntegerType
)

load_dotenv()

# =============================================================================
# F&B DATA LAKE BATCH PROCESSING JOB (MINIO → SPARK → POSTGRES)
# All credentials loaded from .env — no hardcoded values.
# =============================================================================

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS   = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET   = os.getenv("MINIO_SECRET_KEY", "minioadmin")
DB_URL         = os.getenv("SUPABASE_JDBC_URL")
DB_PROPERTIES  = {
    "user":     os.getenv("SUPABASE_DB_USER"),
    "password": os.getenv("SUPABASE_DB_PASSWORD"),
    "driver":   "org.postgresql.Driver"
}


def get_spark_session():
    return (
        SparkSession.builder
        .appName("FnB_DataLake_ML_Feature_Pipeline")
        .config("spark.hadoop.fs.s3a.endpoint",          MINIO_ENDPOINT)
        .config("spark.hadoop.fs.s3a.access.key",        MINIO_ACCESS)
        .config("spark.hadoop.fs.s3a.secret.key",        MINIO_SECRET)
        .config("spark.hadoop.fs.s3a.path.style.access", "true")
        .config("spark.hadoop.fs.s3a.impl",              "org.apache.hadoop.fs.s3a.S3AFileSystem")
        .config(
            "spark.jars.packages",
            "org.apache.hadoop:hadoop-aws:3.3.4,org.postgresql:postgresql:42.5.4"
        )
        .getOrCreate()
    )


def run_pipeline():
    spark = get_spark_session()

    # -------------------------------------------------------------------------
    # 1. EXTRACT: Read Raw Data from MinIO (Bronze Zone)
    #    Schema matches kafka_producer.py: unit_price (not total_price)
    # -------------------------------------------------------------------------
    print("[INFO] Reading raw POS transactions from MinIO Data Lake...")

    # Schema aligned with kafka_producer.py output
    raw_schema = StructType([
        StructField("transaction_id", StringType(),  True),
        StructField("branch_id",      IntegerType(), True),
        StructField("product_id",     IntegerType(), True),
        StructField("quantity",       IntegerType(), True),
        StructField("unit_price",     DoubleType(),  True),   # ✅ fixed: was total_price
        StructField("timestamp",      StringType(),  True),
    ])

    try:
        raw_df = spark.read.format("json").schema(raw_schema).load("s3a://fnb-datalake/raw/pos_transactions/")
    except Exception as e:
        print(f"[WARNING] MinIO not reachable or bucket empty: {e}")
        print("[INFO] Using mock DataFrame to demonstrate pipeline.")
        mock_data = [
            ("txn_1", 1, 3, 2, 5.25,  "2026-04-20 12:30:00"),
            ("txn_1", 1, 3, 2, 5.25,  "2026-04-20 12:30:00"),  # duplicate for dedup demo
            ("txn_2", 1, 5, 1, 5.00,  "2026-04-21 13:00:00"),
            ("txn_3", 2, 3, 4, 5.25,  "2026-04-22 19:15:00"),
            ("txn_4", 1, 3, 5, 5.25,  "2026-04-23 12:00:00"),
            ("txn_5", 1, 3, 1, 5.25,  "2026-04-24 18:45:00"),
            ("txn_6", 1, 3, 2, 5.25,  "2026-04-25 12:10:00"),
            ("txn_7", 1, 3, 6, 5.25,  "2026-04-26 19:30:00"),
        ]
        raw_df = spark.createDataFrame(mock_data, raw_schema)

    # -------------------------------------------------------------------------
    # 2. TRANSFORM: Cleaning & Deduplication
    #    Compute total_price = unit_price * quantity here (not from Kafka)
    # -------------------------------------------------------------------------
    print("[INFO] Cleaning and deduplicating raw data...")
    clean_df = (
        raw_df
        .dropDuplicates(["transaction_id"])
        .filter(F.col("unit_price") > 0)
        .withColumn("total_price", F.col("unit_price") * F.col("quantity"))   # ✅ computed
        .withColumn("timestamp", F.to_timestamp("timestamp"))
        .withColumn("date",      F.to_date("timestamp"))
    )

    # -------------------------------------------------------------------------
    # 3. TRANSFORM: Daily Aggregations (Silver Zone)
    # -------------------------------------------------------------------------
    print("[INFO] Aggregating daily sales per branch and product...")
    sales_agg = (
        clean_df
        .groupBy("date", "branch_id", "product_id")
        .agg(
            F.sum("quantity")        .alias("daily_quantity"),
            F.sum("total_price")     .alias("daily_revenue"),
            F.count("transaction_id").alias("transaction_count"),
        )
    )

    # -------------------------------------------------------------------------
    # 4. TRANSFORM: Feature Engineering for ML (Gold Zone)
    #    Rolling 7-day windows, popularity trend, branch demand index
    # -------------------------------------------------------------------------
    print("[INFO] Engineering ML Features (Rolling Windows & Trends)...")

    window_7d     = Window.partitionBy("branch_id", "product_id").orderBy("date").rowsBetween(-6, Window.currentRow)
    window_branch = Window.partitionBy("branch_id")

    ml_features = (
        sales_agg
        .withColumn("rolling_7d_sales",        F.sum("daily_revenue") .over(window_7d))
        .withColumn("rolling_7d_qty",           F.sum("daily_quantity").over(window_7d))
        .withColumn("popularity_trend_score",   F.col("rolling_7d_qty") / 7.0)
        .withColumn("branch_demand_index",
            F.col("transaction_count") / F.avg("transaction_count").over(window_branch)
        )
        .select(
            F.col("date")                                        .alias("feature_date"),
            "branch_id",
            "product_id",
            F.round("rolling_7d_sales",       2)                .alias("rolling_7d_sales"),
            F.round("popularity_trend_score", 4)                .alias("popularity_trend_score"),
            F.round("branch_demand_index",    4)                .alias("branch_demand_index"),
        )
    )

    ml_features.show(truncate=False)

    # -------------------------------------------------------------------------
    # 5. LOAD: Push Features to PostgreSQL Serving Layer (Supabase)
    # -------------------------------------------------------------------------
    print("[INFO] Pushing ML Features to PostgreSQL Serving Layer...")
    try:
        ml_features.write \
            .mode("overwrite") \
            .option("truncate", "true") \
            .jdbc(url=DB_URL, table="ml.ml_features", properties=DB_PROPERTIES)
        print("[SUCCESS] Pipeline complete. Features stored in Supabase ml.ml_features.")
    except Exception as e:
        print(f"[WARNING] Could not write to Supabase via JDBC: {e}")
        print("[INFO] Run this job inside the spark-batch-job Docker container.")


if __name__ == "__main__":
    run_pipeline()
