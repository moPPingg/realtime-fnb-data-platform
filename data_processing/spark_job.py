"""
DEPRECATED: This file has been superseded by spark_streaming_consumer.py.
Use spark_streaming_consumer.py for the real-time Kafka → Supabase pipeline.
This file is kept for reference only and should NOT be run directly.
"""

import os
from dotenv import load_dotenv
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, to_date
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, TimestampType

load_dotenv()

# ⚠️  DEPRECATED - Use spark_streaming_consumer.py instead
# All credentials loaded from .env (no hardcoded values)

KAFKA_BROKER   = os.getenv("KAFKA_BROKER", "localhost:9092")
DB_URL         = os.getenv("SUPABASE_JDBC_URL")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS   = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET   = os.getenv("MINIO_SECRET_KEY", "minioadmin")

DB_PROPERTIES = {
    "user":     os.getenv("SUPABASE_DB_USER"),
    "password": os.getenv("SUPABASE_DB_PASSWORD"),
    "driver":   "org.postgresql.Driver"
}

# Schema matches kafka_producer.py output exactly
SCHEMA = StructType([
    StructField("transaction_id", StringType(),  True),
    StructField("branch_id",      IntegerType(), True),
    StructField("product_id",     IntegerType(), True),
    StructField("quantity",       IntegerType(), True),
    StructField("unit_price",     DoubleType(),  True),
    StructField("timestamp",      StringType(),  True),
])


def process_stream():
    raise RuntimeError(
        "spark_job.py is deprecated. Run data_streaming/spark_streaming_consumer.py instead."
    )


if __name__ == "__main__":
    process_stream()
