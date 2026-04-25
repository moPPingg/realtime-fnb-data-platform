import json
import time
import uuid
import random
import logging
from kafka import KafkaProducer
from datetime import datetime

# =============================================================================
# KAFKA PRODUCER - POS SYSTEM EMULATOR
# Simulates edge-node Point of Sale (POS) machines pushing events to Kafka
# =============================================================================

import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

KAFKA_BROKER = os.getenv("KAFKA_BROKER", "localhost:9092")
TOPIC_NAME = "pos_transactions"

def get_producer():
    """Initializes Kafka Producer with retry mechanism."""
    while True:
        try:
            producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                retries=5,
                request_timeout_ms=10000
            )
            logging.info(f"Connected to Kafka Broker at {KAFKA_BROKER}.")
            return producer
        except Exception as e:
            logging.error(f"Kafka connection failed: {e}. Retrying in 5 seconds...")
            time.sleep(5)

def simulate_pos_events():
    producer = get_producer()
    logging.info(f"Starting real-time POS simulation publishing to '{TOPIC_NAME}'...")
    
    try:
        while True:
            # Generate realistic transaction payload
            transaction = {
                "transaction_id": str(uuid.uuid4()),
                "branch_id": random.randint(1, 10),
                "product_id": random.randint(1, 20),
                "quantity": random.choices([1, 2, 3, 4, 5], weights=[60, 20, 10, 5, 5])[0],
                "unit_price": round(random.uniform(5.0, 15.0), 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send to Kafka Asynchronously
            future = producer.send(TOPIC_NAME, transaction)
            record_metadata = future.get(timeout=10) # Block to ensure delivery for logging
            
            logging.info(f"Produced Txn {transaction['transaction_id']} -> Partition: {record_metadata.partition}")
            
            # Simulate real-time streaming interval (high velocity)
            time.sleep(random.uniform(0.1, 1.0))
            
    except KeyboardInterrupt:
        logging.info("Stopping producer gracefully...")
    finally:
        producer.close()

if __name__ == "__main__":
    simulate_pos_events()
