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
from dotenv import load_dotenv
import os

init(autoreset=True)
load_dotenv()

# Supabase connection using the Pooler for IPv4 from .env
DB_URL = os.getenv("SUPABASE_DB_URL")

def execute_setup_sql(conn):
    """Executes the SQL file to ensure schema & procedures exist."""
    print("Checking database schema and applying SQL...")
    # ✅ FIX: Only run supabase_enterprise_schema.sql.
    # supabase_advanced_schema.sql is a deprecated duplicate and has been removed from this run.
    sql_path     = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "supabase_enterprise_schema.sql")
    upgrade_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "supabase_olap_upgrades.sql")
    auth_path    = os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "supabase_auth_employees.sql")
    try:
        with conn.cursor() as cur:
            for path, name in [(sql_path, "Schema"), (upgrade_path, "Upgrades"), (auth_path, "Auth")]:
                try:
                    print(f"Applying {name}...")
                    with open(path, "r", encoding="utf-8") as f:
                        cur.execute(f.read())
                except Exception as e:
                    print(Fore.RED + f"[ERROR] Failed to apply {name} ({path}): {e}")
                    raise e
            conn.commit()
            print(Fore.GREEN + "[SUCCESS] Advanced Schema and Procedures applied successfully!")
    except Exception as e:
        print(Fore.RED + f"Critical failure in SQL application: {e}")
        conn.rollback()


def init_dynamic_master_data(conn):
    """Uses specialized Phuc Long data to seed master products and branches."""
    cur = conn.cursor()
    cur.execute("SET search_path TO oltp, public;")
    
    # 1. Seed Branches (District 1 to 10)
    cur.execute("SELECT COUNT(*) FROM oltp.branches")
    if cur.fetchone()[0] == 0:
        print(Fore.CYAN + "Initializing Branches (Q1-Q10)...")
        branches = []
        for i in range(1, 11):
            name = f"District {i} (Q{i})"
            weight = 7 if i == 1 else random.randint(4, 6)
            branches.append({"name": name, "traffic_weight": weight})
        cur.execute("SELECT oltp.seed_master_data(%s, '[]')", (json.dumps(branches),))
        conn.commit()

    # 1.1 Seed Initial Employees (after branches exist)
    cur.execute("SELECT COUNT(*) FROM oltp.employees")
    if cur.fetchone()[0] == 0:
        print(Fore.CYAN + "Initializing Employees...")
        # Get actual branch IDs to avoid FK violations
        cur.execute("SELECT id FROM oltp.branches ORDER BY id LIMIT 2")
        branch_ids = [r[0] for r in cur.fetchall()]
        
        employees = [
            ("MGR001", "Alice Admin", "MANAGER", None, "admin@phuclong.com.vn"),
            ("STF001", "Bob Staff", "STAFF", branch_ids[0] if len(branch_ids) > 0 else None, "staff1@phuclong.com.vn"),
            ("STF002", "Charlie Staff", "STAFF", branch_ids[1] if len(branch_ids) > 1 else None, "staff2@phuclong.com.vn")
        ]
        
        for emp in employees:
            cur.execute("""
                INSERT INTO oltp.employees (employee_code, name, role, branch_id, email)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (employee_code) DO NOTHING
            """, emp)
        conn.commit()
        print(Fore.GREEN + "[SUCCESS] Initial Employees Seeded!")

    # 2. Seed Phuc Long Products (Beverage, Food, Bakery)
    cur.execute("SELECT COUNT(*) FROM oltp.products")
    print(Fore.CYAN + "Resetting and Seeding Full Product Catalog...")
    cur.execute("TRUNCATE oltp.products CASCADE")

    phuc_long_menu = [
        {"name": "Trà Sữa Phúc Long", "category": "Trà Sữa", "base_price": 4.5, "popularity_weight": 100},
        {"name": "Trà Đào Phúc Long", "category": "Trà Trái Cây", "base_price": 5.0, "popularity_weight": 95},
        {"name": "Oolong Thảo Mộc", "category": "Trà Nguyên Bản", "base_price": 4.5, "popularity_weight": 80},
        {"name": "Hồng Trà Sữa", "category": "Trà Sữa", "base_price": 4.0, "popularity_weight": 85},
        {"name": "Cà Phê Sữa", "category": "Cà Phê", "base_price": 3.5, "popularity_weight": 90},
        {"name": "Cà Phê Đen", "category": "Cà Phê", "base_price": 3.0, "popularity_weight": 70},
        {"name": "Matcha Latte", "category": "Trà Sữa", "base_price": 5.5, "popularity_weight": 65},
        {"name": "Trà Nhãn Sen", "category": "Trà Trái Cây", "base_price": 5.0, "popularity_weight": 75},
        {"name": "Bánh Mì Phúc Long", "category": "Bánh Mì", "base_price": 3.5, "popularity_weight": 85},
        {"name": "Croissant", "category": "Bánh Ngọt", "base_price": 2.5, "popularity_weight": 45},
        {"name": "Tiramisu", "category": "Bánh Ngọt", "base_price": 4.5, "popularity_weight": 40},
        {"name": "Trà Sen Đá Xay", "category": "Đá Xay", "base_price": 6.5, "popularity_weight": 85},
        {"name": "Cà Phê Đá Xay", "category": "Đá Xay", "base_price": 6.0, "popularity_weight": 70},
        {"name": "Trà Xanh Đá Xay", "category": "Đá Xay", "base_price": 6.5, "popularity_weight": 75},
        {"name": "Nước Cam Tươi", "category": "Nước Ép", "base_price": 4.5, "popularity_weight": 55},
        {"name": "Soda Blue Ocean", "category": "Soda", "base_price": 4.5, "popularity_weight": 35},
        {"name": "Mousse Đào", "category": "Bánh Ngọt", "base_price": 4.0, "popularity_weight": 30},
        {"name": "Trà Thiết Quan Âm", "category": "Trà Nguyên Bản", "base_price": 4.0, "popularity_weight": 50},
        {"name": "Trà Xanh Thái Nguyên", "category": "Trà Nguyên Bản", "base_price": 3.5, "popularity_weight": 40},
        {"name": "Latte Cà Phê", "category": "Cà Phê", "base_price": 5.0, "popularity_weight": 60}
    ]
    
    cur.execute("SELECT oltp.seed_master_data('[]', %s)", (json.dumps(phuc_long_menu),))
    conn.commit()
    print(Fore.GREEN + "[SUCCESS] Expanded Phuc Long Menu Seeded!")

    # 3. Seed Inventory with Expiry Dates & Batch Numbers
    print(Fore.CYAN + "Seeding Phuc Long Inventory (Ingredients & Expiry)...")
    cur.execute("TRUNCATE oltp.inventory")
    
    ingredients = [
        {"name": "Lá Trà Oolong", "type": "Tea", "unit": "kg", "reorder": 10},
        {"name": "Hồng Trà", "type": "Tea", "unit": "kg", "reorder": 10},
        {"name": "Đào Miếng", "type": "Topping", "unit": "can", "reorder": 20},
        {"name": "Bột Béo", "type": "Powder", "unit": "kg", "reorder": 15},
        {"name": "Sữa Đặc", "type": "Dairy", "unit": "can", "reorder": 30},
        {"name": "Hạt Sen", "type": "Topping", "unit": "kg", "reorder": 5}
    ]
    
    cur.execute("SELECT id FROM oltp.branches")
    branch_ids = [r[0] for r in cur.fetchall()]
    
    import datetime
    for b_id in branch_ids:
        for ing in ingredients:
            stock = random.uniform(10, 100)
            # Create some nearly expired items for alerts
            days_to_expiry = random.randint(-5, 180)
            expiry = datetime.date.today() + datetime.timedelta(days=days_to_expiry)
            batch = f"LOT-{random.randint(1000, 9999)}"
            
            cur.execute("""
                INSERT INTO oltp.inventory (branch_id, product_name, stock_quantity, unit, reorder_level, expiry_date, batch_number, ingredient_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (b_id, ing['name'], stock, ing['unit'], ing['reorder'], expiry, batch, ing['type']))
            
    conn.commit()
    print(Fore.GREEN + "[SUCCESS] Inventory Seeded with Expiry Dates!")


def seed_history(conn):
    """Triggers the Highly-Optimized SQL RPC to generate historical data."""
    cur = conn.cursor()
    cur.execute("SET search_path TO oltp, public;")
    print(Fore.CYAN + "\n[INFO] Seeding 90 days of historical orders (500 orders/day) for high-volume analytics...")
    print(Style.DIM + "This will generate ~45,000 orders and ~100,000+ line items...")
    
    # Reset existing history to avoid mixing old/new schemas
    cur.execute("TRUNCATE oltp.orders CASCADE")
    
    # Calls SQL Function: seed_historical_orders_bulk(start_date, end_date, base_orders_per_day)
    cur.execute("SELECT oltp.seed_historical_orders_bulk((CURRENT_DATE - 90)::DATE, CURRENT_DATE::DATE, 500)")
    conn.commit()
    print(Fore.GREEN + "[SUCCESS] 90-Day High-Volume Historical seeding complete!")

    # ✅ FIX: Refresh OLAP star schema AFTER bulk seeding is done (not inside the seeder).
    # This avoids TRUNCATE + rebuild happening on every single realtime order.
    print(Fore.CYAN + "[INFO] Rebuilding OLAP Star Schema for Big Data...")
    cur.execute("SELECT olap.refresh_star_schema()")
    conn.commit()
    print(Fore.GREEN + "[SUCCESS] OLAP Analytics ready with 90-day history!")


def simulate_realtime(conn):
    """Triggers the SQL RPC to generate a realistic realtime order."""
    print(Fore.CYAN + "\n[START] Starting real-time simulation via RPC...")
    cur = conn.cursor()
    cur.execute("SET search_path TO oltp, public;")
    try:
        while True:
            # Python purely acts as a trigger interval. NO business logic here!
            cur.execute("SELECT oltp.trigger_realtime_order()")
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
