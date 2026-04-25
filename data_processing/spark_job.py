from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, IntegerType, TimestampType

# Supabase PostgreSQL credentials (using Pooler for IPv4 compatibility)
DB_URL = "jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
DB_PROPERTIES = {
    "user": "postgres.ifwpejmuodpouurbclys",
    "password": "thienkhoi5@",
    "driver": "org.postgresql.Driver"
}

def process_stream():
    spark = SparkSession.builder \
        .appName("FnB_RealTime_Processing") \
        .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.0,org.postgresql:postgresql:42.5.0,org.apache.hadoop:hadoop-aws:3.3.2,com.amazonaws:aws-java-sdk-bundle:1.11.1026") \
        .config("spark.hadoop.fs.s3a.endpoint", "http://localhost:9000") \
        .config("spark.hadoop.fs.s3a.access.key", "admin") \
        .config("spark.hadoop.fs.s3a.secret.key", "password123") \
        .config("spark.hadoop.fs.s3a.path.style.access", "true") \
        .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem") \
        .getOrCreate()

    # Define schema matching POS data
    schema = StructType([
        StructField("order_id", StringType(), True),
        StructField("branch_id", StringType(), True),
        StructField("employee_id", StringType(), True),
        StructField("item_id", StringType(), True),
        StructField("item_name", StringType(), True),
        StructField("category", StringType(), True),
        StructField("quantity", IntegerType(), True),
        StructField("total_price", DoubleType(), True),
        StructField("timestamp", TimestampType(), True)
    ])

    # Read stream from Kafka
    df = spark \
        .readStream \
        .format("kafka") \
        .option("kafka.bootstrap.servers", "localhost:9092") \
        .option("subscribe", "pos_transactions") \
        .load()

    # Parse JSON value
    parsed_df = df.selectExpr("CAST(value AS STRING)") \
        .select(from_json(col("value"), schema).alias("data")) \
        .select("data.*")

    # Add partition column for datalake
    from pyspark.sql.functions import to_date
    enriched_df = parsed_df.withColumn("date", to_date(col("timestamp")))

    # Define function to write batch to PostgreSQL
    def write_to_postgres(batch_df, batch_id):
        # We drop the 'date' column for Postgres because it's only meant for datalake partitioning
        batch_df.drop("date").write \
            .jdbc(url=DB_URL, table="transactions", mode="append", properties=DB_PROPERTIES)

    # 1. Write stream to PostgreSQL
    pg_query = enriched_df.writeStream \
        .foreachBatch(write_to_postgres) \
        .outputMode("append") \
        .start()

    # 2. Write stream to MinIO Data Lake (Raw)
    datalake_query = enriched_df.writeStream \
        .format("parquet") \
        .option("path", "s3a://datalake/raw/pos_transactions/") \
        .option("checkpointLocation", "s3a://datalake/checkpoints/pos_transactions/") \
        .partitionBy("date") \
        .outputMode("append") \
        .start()

    spark.streams.awaitAnyTermination()

if __name__ == "__main__":
    process_stream()
