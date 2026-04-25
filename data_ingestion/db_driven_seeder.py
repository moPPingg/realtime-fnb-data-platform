"""
Advanced Python Seeder - OLTP / OLAP Separation.
NO hardcoded data arrays, NO complex python logic, NO python loops for data generation.
All business rules, batch optimization, and normal distribution logic
are executed via Supabase SQL Stored Procedures.
"""

import time
import json
import psycopg2
import random
from faker import Faker
from colorama import Fore, Style, init
import os

init(autoreset=True)

# Supabase connection using the Pooler for IPv4
DB_URL = "postgresql://postgres.bgicsxftnryxyrfbvprt:thienkhoi5%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

def execute_setup_sql(conn):
    """Executes the SQL file to ensure schema & procedures exist."""
    print("Checking database schema and applying SQL...")
    sql_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "supabase_enterprise_schema.sql")
    upgrade_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "supabase_olap_upgrades.sql")
    try:
        with conn.cursor() as cur:
            with open(sql_path, "r", encoding="utf-8") as f:
                cur.execute(f.read())
            with open(upgrade_path, "r", encoding="utf-8") as f:
                cur.execute(f.read())
            conn.commit()
            print(Fore.GREEN + "[SUCCESS] Advanced Schema and Procedures applied successfully!")
    except Exception as e:
        print(Fore.RED + f"Skipping SQL schema auto-apply: {e}")
        conn.rollback()


def init_dynamic_master_data(conn):
    """Uses Faker to generate dynamic master data and passes it to SQL via JSON."""
    fake = Faker()
    cur = conn.cursor()
    cur.execute("SET search_path TO oltp, public;")
    
    cur.execute("SELECT COUNT(*) FROM branches")
    if cur.fetchone()[0] > 0:
        print(Fore.GREEN + "[SUCCESS] Master data already exists. Skipping generation.")
        return

    print(Fore.CYAN + "Initializing Dynamic Master Data (Idempotent JSON Seed)...")
    
    # Generate branches array
    branches = []
    for _ in range(10):
        weight = random.choices([1, 2, 5, 8, 10], weights=[20, 30, 20, 20, 10])[0]
        name = f"{fake.city()} {random.choice(['Cafe', 'Bistro', 'Express', 'Lounge'])}"
        branches.append({"name": name, "traffic_weight": weight})
        
    # Generate products array
    categories = ["Beverage", "Food", "Dessert", "Bakery"]
    products = []
    for _ in range(20):
        pop_weight = random.choices([10, 30, 70, 100], weights=[30, 40, 20, 10])[0]
        name = fake.word().capitalize() + " " + random.choice(["Delight", "Special", "Classic"])
        category = random.choice(categories)
        price = round(random.uniform(3.0, 15.0), 2)
        products.append({"name": name, "category": category, "base_price": price, "popularity_weight": pop_weight})

    # Call SQL function to handle the JSON arrays idempotently
    cur.execute("SELECT seed_master_data(%s, %s)", (json.dumps(branches), json.dumps(products)))
    conn.commit()
    print(Fore.GREEN + "[SUCCESS] Dynamic Master Data Inserted via SQL Stored Procedure!")


def seed_history(conn):
    """Triggers the Highly-Optimized SQL RPC to generate historical data."""
    cur = conn.cursor()
    cur.execute("SET search_path TO oltp, public;")
    cur.execute("SELECT COUNT(*) FROM orders")
    if cur.fetchone()[0] > 0:
        print(Fore.GREEN + "[SUCCESS] History already seeded. Skipping bulk history generation.")
        return
        
    print(Fore.CYAN + "\n[INFO] Seeding 30 days of historical orders using `generate_series` batch optimization...")
    print(Style.DIM + "This relies entirely on PostgreSQL CTEs, Temp Tables, and Normal Distributions...")
    
    # Calls SQL Function: seed_historical_orders_bulk(start_date, end_date, base_orders_per_day)
    cur.execute("SELECT seed_historical_orders_bulk((CURRENT_DATE - 30)::DATE, CURRENT_DATE::DATE, 50)")
    conn.commit()
    print(Fore.GREEN + "[SUCCESS] Historical seeding complete!")


def simulate_realtime(conn):
    """Triggers the SQL RPC to generate a realistic realtime order."""
    print(Fore.CYAN + "\n[START] Starting real-time simulation via RPC...")
    cur = conn.cursor()
    cur.execute("SET search_path TO oltp, public;")
    try:
        while True:
            # Python purely acts as a trigger interval. NO business logic here!
            cur.execute("SELECT trigger_realtime_order()")
            order_id = cur.fetchone()[0]
            conn.commit()
            
            print(f"[{time.strftime('%H:%M:%S')}] {Fore.YELLOW}Triggered real-time order ID:{Style.RESET_ALL} {order_id}")
            time.sleep(1) # 1 order per second
            
    except KeyboardInterrupt:
        print(Fore.RED + "\n[STOP] Simulation stopped.")
        cur.close()


if __name__ == "__main__":
    print("=" * 60)
    print("  F&B DATABASE-FIRST SEEDER (ADVANCED OLTP)  ")
    print("=" * 60)

    try:
        conn = psycopg2.connect(DB_URL)
        print(Fore.GREEN + "[SUCCESS] Connected to Supabase Pooler!")
    except Exception as e:
        print(Fore.RED + f"[ERROR] Connection failed: {e}")
        exit(1)

    execute_setup_sql(conn)
    init_dynamic_master_data(conn)
    seed_history(conn)
    simulate_realtime(conn)
    
    conn.close()
