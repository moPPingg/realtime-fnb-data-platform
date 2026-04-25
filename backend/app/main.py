from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from . import models, database

app = FastAPI(title="F&B Internal Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to dashboard URL
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Dashboard Analytics (OLAP) ──────────────────────────────────────

@app.get("/api/dashboard/revenue")
def get_revenue(db: Session = Depends(database.get_db)):
    # Using fact_orders_daily for lightning-fast aggregated stats
    result = db.execute(text("SELECT SUM(total_net) as rev, SUM(total_orders) as ords FROM olap.fact_orders_daily")).fetchone()
    return {
        "total_revenue": result[0] if result and result[0] else 0,
        "total_orders": result[1] if result and result[1] else 0
    }

@app.get("/api/dashboard/revenue-by-hour")
def get_revenue_by_hour(db: Session = Depends(database.get_db)):
    results = db.query(models.RevenueByHour).order_by(models.RevenueByHour.hour_of_day).all()
    return [{"hour": f"{r.hour_of_day}:00", "revenue": r.total_revenue, "orders": r.total_orders} for r in results]

@app.get("/api/dashboard/branch-performance")
def get_branch_performance(db: Session = Depends(database.get_db)):
    results = db.query(models.BranchPerformance).order_by(models.BranchPerformance.revenue_rank).all()
    return [{"branch": r.branch_name, "revenue": r.total_revenue, "profit": r.total_profit, "orders": r.total_orders, "rank": r.revenue_rank} for r in results]

@app.get("/api/dashboard/top-products")
def get_top_products(db: Session = Depends(database.get_db)):
    results = db.execute(text("SELECT product_name, SUM(total_units_sold) FROM olap.vw_top_products_branch GROUP BY product_name ORDER BY SUM(total_units_sold) DESC LIMIT 10")).fetchall()
    return [{"item_name": r[0], "total_sold": r[1]} for r in results]

# ── Core Entities (OLTP) ────────────────────────────────────────────

@app.get("/api/branches")
def get_branches(db: Session = Depends(database.get_db)):
    results = db.query(models.Branch).all()
    return [{"id": r.id, "name": r.name, "traffic_weight": r.traffic_weight} for r in results]

@app.get("/api/employees")
def get_employees(db: Session = Depends(database.get_db)):
    results = db.query(models.Employee).all()
    return [{
        "id": r.id, 
        "employee_code": r.employee_code, 
        "name": r.name, 
        "role": r.role, 
        "branch_id": r.branch_id, 
        "status": r.status
    } for r in results]

@app.get("/api/inventory")
def get_inventory(branch_id: int = None, db: Session = Depends(database.get_db)):
    query = db.query(models.InventoryCurrent)
    if branch_id:
        query = query.filter(models.InventoryCurrent.branch_id == branch_id)
    results = query.all()
    return [{"branch_id": r.branch_id, "product_id": r.product_id, "stock_level": r.stock_level} for r in results]

@app.get("/api/dashboard/inventory-alert")
def get_inventory_alert(threshold: int = 500, db: Session = Depends(database.get_db)):
    results = db.query(models.InventoryCurrent).filter(models.InventoryCurrent.stock_level < threshold).all()
    return [{"branch_id": r.branch_id, "product_id": r.product_id, "current_stock": r.stock_level} for r in results]

@app.get("/api/system/data-quality")
def run_data_quality_checks(db: Session = Depends(database.get_db)):
    results = db.execute(text("SELECT * FROM olap.run_data_quality_checks()")).fetchall()
    return [{"check_name": r[0], "status": r[1], "details": r[2]} for r in results]
