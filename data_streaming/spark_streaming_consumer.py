import logging
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, expr

from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, DoubleType
)

import os
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# SPARK STRUCTURED STREAMING CONSUMER
# Kafka topic → parse JSON → write to oltp.orders + oltp.order_items (via staging)
# =============================================================================

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

KAFKA_BROKER  = os.getenv("KAFKA_BROKER", "localhost:9092")
DB_URL        = os.getenv("SUPABASE_JDBC_URL")
DB_PROPERTIES = {
    "user":     os.getenv("SUPABASE_DB_USER"),
    "password": os.getenv("SUPABASE_DB_PASSWORD"),
    "driver":   "org.postgresql.Driver"
}

# Schema must match kafka_producer.py exactly
SCHEMA = StructType([
    StructField("transaction_id", StringType(),  True),
    StructField("branch_id",      IntegerType(), True),
    StructField("product_id",     IntegerType(), True),
    StructField("quantity",       IntegerType(), True),
    StructField("unit_price",     DoubleType(),  True),
    StructField("timestamp",      StringType(),  True),
])


def process_micro_batch(df, epoch_id):
    """
    For every 5-second micro-batch:
    1. Write to staging table (oltp.raw_kafka_transactions)
       → A Postgres trigger on that table then normalizes rows into
         oltp.orders + oltp.order_items automatically.
    2. Log any traffic spike alerts.
    """
    logging.info(f"--- Processing Micro-Batch: {epoch_id} ---")

    if df.isEmpty():
        logging.info("No new events. Waiting...")
        return

    df.persist()

    try:
        # 1. Staging write — Postgres trigger handles normalization
        df.write.jdbc(
            url=DB_URL,
            table="oltp.raw_kafka_transactions",
            mode="append",
            properties=DB_PROPERTIES
        )
        logging.info(f"Wrote {df.count()} streaming records → oltp.raw_kafka_transactions")
    except Exception as e:
        logging.error(f"Failed to write to Supabase: {e}")

    # 2. Traffic spike detection (in-memory, no extra DB round-trip)
    SPIKE_THRESHOLD = 20
    spikes = (
        df.groupBy("branch_id")
          .sum("quantity")
          .filter(col("sum(quantity)") >= SPIKE_THRESHOLD)
          .collect()
    )
    for row in spikes:
        logging.warning(
            f"🚨 [SPIKE] Branch {row['branch_id']}: "
            f"{row['sum(quantity)']} units in 5 s — check stock!"
        )

    df.unpersist()


def start_streaming():
    logging.info("Initializing Spark Structured Streaming...")

    spark = (
        SparkSession.builder
        .appName("FnB_RealTime_Kafka_Consumer")
        .config(
            "spark.jars.packages",
            "org.apache.spark:spark-sql-kafka-0-10_2.12:3.5.1,"
            "org.postgresql:postgresql:42.5.4"
        )
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")

    kafka_df = (
        spark.readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BROKER)
        .option("subscribe", "pos_transactions")
        .option("startingOffsets", "latest")
        .option("failOnDataLoss", "false")
        .load()
    )

    parsed_df = (
        kafka_df
        .selectExpr("CAST(value AS STRING)")
        .select(from_json(col("value"), SCHEMA).alias("data"))
        .select("data.*")
    )

    query = (
        parsed_df.writeStream
        .outputMode("append")
        .foreachBatch(process_micro_batch)
        .trigger(processingTime="5 seconds")
        # ✅ Use a volume-mounted path in Docker so checkpoints survive restarts
        .option("checkpointLocation", "/app/checkpoints/pos_streaming")
        .start()
    )

    query.awaitTermination()


if __name__ == "__main__":
    start_streaming()
