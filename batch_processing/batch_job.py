from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum, count, window, date_trunc
from datetime import datetime, timedelta

# PostgreSQL credentials
DB_URL = "jdbc:postgresql://localhost:5432/fnb_db"
DB_PROPERTIES = {
    "user": "admin",
    "password": "password",
    "driver": "org.postgresql.Driver"
}

def process_batch():
    spark = SparkSession.builder \
        .appName("FnB_Batch_Processing_ML_Prep") \
        .config("spark.jars.packages", "org.postgresql:postgresql:42.5.0,org.apache.hadoop:hadoop-aws:3.3.2,com.amazonaws:aws-java-sdk-bundle:1.11.1026") \
        .config("spark.hadoop.fs.s3a.endpoint", "http://localhost:9000") \
        .config("spark.hadoop.fs.s3a.access.key", "admin") \
        .config("spark.hadoop.fs.s3a.secret.key", "password123") \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
        .getOrCreate()

    # Define time window for batch processing (e.g., yesterday)
    yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
    print(f"Processing data for date: {yesterday}")

    # Read raw data from Data Lake (partition pruning)
    try:
        raw_df = spark.read.format("parquet") \
            .load(f"s3a://datalake/raw/pos_transactions/date={yesterday}")
    except Exception as e:
        print(f"No data found for {yesterday}: {e}")
        return

    # ML Readiness: Feature Engineering for Demand Forecasting
    # Aggregate sales by item, branch, and hour
    demand_features_df = raw_df \
        .withColumn("hour", date_trunc("hour", col("timestamp"))) \
        .groupBy("branch_id", "item_id", "hour") \
        .agg(
            sum("quantity").alias("total_quantity"),
            sum("total_price").alias("total_revenue"),
            count("order_id").alias("order_count")
        )

    # ML Readiness: Feature Engineering for Product Recommendations
    # Co-occurrence analysis setup (Simplified: users/orders mapping to items)
    # E.g., aggregating what items were bought together in the same order
    recommendation_features_df = raw_df \
        .groupBy("order_id") \
        .agg(
            # For a real implementation, you might use collect_list or map logic
            count("item_id").alias("basket_size"),
            sum("total_price").alias("basket_value")
        )

    # Save processed ML features back to PostgreSQL Analytics Tables
    demand_features_df.write \
        .jdbc(url=DB_URL, table="ml_demand_features", mode="append", properties=DB_PROPERTIES)

    recommendation_features_df.write \
        .jdbc(url=DB_URL, table="ml_recommendation_features", mode="append", properties=DB_PROPERTIES)
    
    # Alternatively, you could save them back to the data lake in a "processed" zone
    demand_features_df.write \
        .format("parquet") \
        .mode("overwrite") \
        .save(f"s3a://datalake/processed/demand_features/date={yesterday}")

    print("Batch processing completed successfully.")
    spark.stop()

if __name__ == "__main__":
    process_batch()
