import logging
from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType, TimestampType

# =============================================================================
# SPARK STRUCTURED STREAMING CONSUMER
# Consumes Kafka topic, performs micro-batch analytics, and pushes to Postgres
# =============================================================================

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Supabase Connection details for the Sink
DB_URL = "jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
DB_PROPERTIES = {
    "user": "postgres.bgicsxftnryxyrfbvprt",
    "password": "thienkhoi5@", 
    "driver": "org.postgresql.Driver"
}

def process_micro_batch(df, epoch_id):
    """
    Executes business logic for every 5-second micro-batch arriving from Kafka.
    """
    logging.info(f"--- Processing Micro-Batch: {epoch_id} ---")
    
    if df.isEmpty():
        logging.info("No new events. Waiting...")
        return

    # --- 1. Real-Time Write to Database (Landing Zone) ---
    # We append directly to a raw staging table in Supabase.
    # Postgres Triggers will handle normalizing this into `orders` and `order_items`
    # and broadcasting the changes via Supabase Realtime to the frontend React app.
    try:
        # Cache DF to prevent re-computation in multiple actions
        df.persist()
        
        df.write.jdbc(url=DB_URL, table="oltp.raw_kafka_transactions", mode="append", properties=DB_PROPERTIES)
        logging.info(f"Successfully wrote {df.count()} streaming records to Supabase.")
    except Exception as e:
        logging.error(f"Failed to write to Supabase Sink: {e}")
        # In production, we send failed batches to a Dead Letter Queue (DLQ) in Kafka or MinIO.

    # --- 2. Low-Stock / Traffic Spike Alerts ---
    # Perform streaming aggregations on the fly
    spike_threshold = 20 # Arbitrary threshold for this demo
    
    traffic_spikes = df.groupBy("branch_id").sum("quantity").filter(col("sum(quantity)") >= spike_threshold).collect()
    for row in traffic_spikes:
        logging.warning(f"🚨 [ALERT] Branch {row['branch_id']} has a traffic spike! {row['sum(quantity)']} items sold in the last 5 seconds. Check Stock!")

    df.unpersist()

def start_streaming():
    logging.info("Initializing Spark Structured Streaming...")
    
    spark = SparkSession.builder \
        .appName("FnB_RealTime_Kafka_Consumer") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.4,org.postgresql:postgresql:42.5.4") \
        .getOrCreate()

    spark.sparkContext.setLogLevel("WARN")

    # Define Schema matching the JSON from Kafka Producer
    schema = StructType([
        StructField("transaction_id", StringType(), True),
        StructField("branch_id", IntegerType(), True),
        StructField("product_id", IntegerType(), True),
        StructField("quantity", IntegerType(), True),
        StructField("unit_price", DoubleType(), True),
        StructField("timestamp", TimestampType(), True)
    ])

    # 1. READ from Kafka Topic
    kafka_df = spark.readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("subscribe", "pos_transactions") \
        .option("startingOffsets", "latest") \
        .option("failOnDataLoss", "false") \
        .load()

    # 2. TRANSFORM JSON value column
    parsed_df = kafka_df.selectExpr("CAST(value AS STRING)") \
        .select(from_json(col("value"), schema).alias("data")) \
        .select("data.*")

    # 3. WRITE Stream using foreachBatch (Micro-batching)
    logging.info("Starting stream computation...")
    query = parsed_df.writeStream \
        .outputMode("append") \
        .foreachBatch(process_micro_batch) \
        .trigger(processingTime="5 seconds") \
        .option("checkpointLocation", "/tmp/spark_checkpoints/pos_streaming") \
        .start()

    query.awaitTermination()

if __name__ == "__main__":
    start_streaming()
