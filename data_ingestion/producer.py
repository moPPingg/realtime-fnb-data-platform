import json
import time
import random
from kafka import KafkaProducer
from datetime import datetime

# Kafka config
KAFKA_BROKER = 'localhost:9092'
TOPIC_NAME = 'pos_transactions'

producer = KafkaProducer(
    bootstrap_servers=[KAFKA_BROKER],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

ITEMS = [
    {"item_id": "I001", "name": "Espresso", "price": 3.0, "category": "Beverage"},
    {"item_id": "I002", "name": "Latte", "price": 4.5, "category": "Beverage"},
    {"item_id": "I003", "name": "Croissant", "price": 2.5, "category": "Food"},
    {"item_id": "I004", "name": "Sandwich", "price": 6.0, "category": "Food"}
]

BRANCHES = ["B01", "B02", "B03"]
EMPLOYEES = ["E101", "E102", "E103", "E104"]

def generate_pos_data():
    item = random.choice(ITEMS)
    qty = random.randint(1, 3)
    return {
        "order_id": f"ORD{random.randint(1000, 9999)}",
        "branch_id": random.choice(BRANCHES),
        "employee_id": random.choice(EMPLOYEES),
        "item_id": item["item_id"],
        "item_name": item["name"],
        "category": item["category"],
        "quantity": qty,
        "total_price": item["price"] * qty,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    print(f"Starting POS data simulation on topic {TOPIC_NAME}...")
    try:
        while True:
            data = generate_pos_data()
            producer.send(TOPIC_NAME, value=data)
            print(f"Sent: {data}")
            time.sleep(random.uniform(0.5, 2.0))
    except KeyboardInterrupt:
        print("Simulation stopped.")
        producer.close()
