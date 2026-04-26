from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from . import models, database
from datetime import date, timedelta

app = FastAPI(title="F&B Internal Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────
# KPI CARDS
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/kpi")
def get_kpi(branch_id: int = None, db: Session = Depends(database.get_db)):
    today_key = int(date.today().strftime("%Y%m%d"))
    yesterday_key = int((date.today() - timedelta(days=1)).strftime("%Y%m%d"))

    branch_filter = "AND fs.branch_key = (SELECT branch_key FROM olap.dim_branch WHERE branch_id = :bid)" if branch_id else ""
    params = {"today": today_key, "yesterday": yesterday_key}
    if branch_id:
        params["bid"] = branch_id

    # Today's KPIs
    kpi_sql = f"""
        SELECT
            COALESCE(SUM(net_amount), 0)               AS revenue_today,
            COUNT(DISTINCT order_id)                   AS orders_today,
            COALESCE(AVG(net_amount), 0)               AS avg_order_value
        FROM olap.fact_sales fs
        JOIN olap.dim_time dt ON dt.time_key = fs.time_key
        WHERE fs.time_key = :today {branch_filter}
    """
    row = db.execute(text(kpi_sql), params).fetchone()

    # Yesterday's revenue (for trend)
    yday_sql = f"""
        SELECT COALESCE(SUM(net_amount), 0) AS revenue_yesterday
        FROM olap.fact_sales fs WHERE fs.time_key = :yesterday {branch_filter}
    """
    yday = db.execute(text(yday_sql), params).fetchone()

    # Top product today
    top_sql = f"""
        SELECT dp.name, SUM(fs.quantity) AS units
        FROM olap.fact_sales fs
        JOIN olap.dim_product dp ON dp.product_key = fs.product_key
        WHERE fs.time_key = :today {branch_filter}
        GROUP BY dp.name ORDER BY units DESC LIMIT 1
    """
    top = db.execute(text(top_sql), params).fetchone()

    rev_today = float(row[0])
    rev_yday = float(yday[0]) if yday else 0
    trend = ((rev_today - rev_yday) / rev_yday * 100) if rev_yday > 0 else 0

    return {
        "revenue_today": round(rev_today, 2),
        "orders_today": row[1] or 0,
        "avg_order_value": round(float(row[2]), 2),
        "revenue_yesterday": round(rev_yday, 2),
        "revenue_trend_pct": round(trend, 1),
        "top_product": top[0] if top else "N/A",
    }


# ─────────────────────────────────────────────────────
# REVENUE BY HOUR
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/revenue-by-hour")
def get_revenue_by_hour(branch_id: int = None, db: Session = Depends(database.get_db)):
    today_key = int(date.today().strftime("%Y%m%d"))
    branch_filter = "AND fs.branch_key = (SELECT branch_key FROM olap.dim_branch WHERE branch_id = :bid)" if branch_id else ""
    params = {"today": today_key}
    if branch_id:
        params["bid"] = branch_id
    sql = f"""
        SELECT hour_of_day, SUM(net_amount) AS revenue, COUNT(DISTINCT order_id) AS orders
        FROM olap.fact_sales fs
        WHERE time_key = :today {branch_filter}
        GROUP BY hour_of_day ORDER BY hour_of_day
    """
    rows = db.execute(text(sql), params).fetchall()
    return [{"hour": f"{r[0]:02d}:00", "revenue": round(float(r[1]), 2), "orders": r[2]} for r in rows]


# ─────────────────────────────────────────────────────
# REVENUE BY DATE (Last 14 days)
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/revenue-by-date")
def get_revenue_by_date(days: int = 14, branch_id: int = None, db: Session = Depends(database.get_db)):
    branch_filter = "AND fs.branch_key = (SELECT branch_key FROM olap.dim_branch WHERE branch_id = :bid)" if branch_id else ""
    params = {"days": days}
    if branch_id:
        params["bid"] = branch_id
    sql = f"""
        SELECT dt.full_date, SUM(fs.net_amount) AS revenue, COUNT(DISTINCT fs.order_id) AS orders
        FROM olap.fact_sales fs
        JOIN olap.dim_time dt ON dt.time_key = fs.time_key
        WHERE dt.full_date >= CURRENT_DATE - INTERVAL '1 day' * :days {branch_filter}
        GROUP BY dt.full_date ORDER BY dt.full_date
    """
    rows = db.execute(text(sql), params).fetchall()
    return [{"date": str(r[0]), "revenue": round(float(r[1]), 2), "orders": r[2]} for r in rows]


# ─────────────────────────────────────────────────────
# TOP PRODUCTS
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/top-products")
def get_top_products(limit: int = 5, branch_id: int = None, db: Session = Depends(database.get_db)):
    branch_filter = "AND fs.branch_key = (SELECT branch_key FROM olap.dim_branch WHERE branch_id = :bid)" if branch_id else ""
    params = {"limit": limit}
    if branch_id:
        params["bid"] = branch_id
    sql = f"""
        SELECT dp.name, dp.category, SUM(fs.quantity) AS units_sold, SUM(fs.net_amount) AS revenue
        FROM olap.fact_sales fs
        JOIN olap.dim_product dp ON dp.product_key = fs.product_key
        WHERE 1=1 {branch_filter}
        GROUP BY dp.name, dp.category
        ORDER BY units_sold DESC LIMIT :limit
    """
    rows = db.execute(text(sql), params).fetchall()
    return [{"name": r[0], "category": r[1], "units_sold": r[2], "revenue": round(float(r[3]), 2)} for r in rows]


# ─────────────────────────────────────────────────────
# BRANCH PERFORMANCE
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/branch-performance")
def get_branch_performance(db: Session = Depends(database.get_db)):
    rows = db.execute(text("""
        SELECT branch_name, total_revenue, total_orders, total_profit, revenue_rank
        FROM olap.vw_branch_performance ORDER BY revenue_rank
    """)).fetchall()
    return [{
        "branch": r[0],
        "revenue": round(float(r[1]), 2) if r[1] else 0,
        "orders": r[2] or 0,
        "profit": round(float(r[3]), 2) if r[3] else 0,
        "rank": r[4]
    } for r in rows]


# ─────────────────────────────────────────────────────
# LOW STOCK ALERTS
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/low-stock")
def get_low_stock(threshold: int = 20, branch_id: int = None, db: Session = Depends(database.get_db)):
    branch_filter = "AND ic.branch_id = :bid" if branch_id else ""
    params = {"threshold": threshold}
    if branch_id:
        params["bid"] = branch_id
    sql = f"""
        SELECT p.name, p.category, b.name AS branch_name, ic.stock_level
        FROM oltp.inventory_current ic
        JOIN oltp.products p ON p.id = ic.product_id
        JOIN oltp.branches b ON b.id = ic.branch_id
        WHERE ic.stock_level < :threshold {branch_filter}
        ORDER BY ic.stock_level ASC
    """
    rows = db.execute(text(sql), params).fetchall()
    return [{
        "product": r[0],
        "category": r[1],
        "branch": r[2],
        "stock": r[3],
        "severity": "critical" if r[3] <= 5 else "warning"
    } for r in rows]


# ─────────────────────────────────────────────────────
# AUTO INSIGHTS
# ─────────────────────────────────────────────────────

@app.get("/api/dashboard/insights")
def get_insights(db: Session = Depends(database.get_db)):
    insights = []

    # 1. Revenue trend per branch (today vs yesterday)
    trend_rows = db.execute(text("""
        SELECT db.name,
            SUM(CASE WHEN fs.time_key = to_char(CURRENT_DATE,'YYYYMMDD')::INT THEN fs.net_amount ELSE 0 END) AS today,
            SUM(CASE WHEN fs.time_key = to_char(CURRENT_DATE - 1,'YYYYMMDD')::INT THEN fs.net_amount ELSE 0 END) AS yesterday
        FROM olap.fact_sales fs
        JOIN olap.dim_branch db ON db.branch_key = fs.branch_key
        WHERE fs.time_key IN (
            to_char(CURRENT_DATE,'YYYYMMDD')::INT,
            to_char(CURRENT_DATE - 1,'YYYYMMDD')::INT
        )
        GROUP BY db.name
    """)).fetchall()

    for r in trend_rows:
        branch, today, yday = r[0], float(r[1]), float(r[2])
        if yday > 0:
            pct = ((today - yday) / yday) * 100
            if pct <= -15:
                insights.append({
                    "type": "warning",
                    "icon": "📉",
                    "text": f"Branch {branch} revenue dropped {abs(pct):.1f}% compared to yesterday"
                })
            elif pct >= 20:
                insights.append({
                    "type": "success",
                    "icon": "📈",
                    "text": f"Branch {branch} revenue surged {pct:.1f}% compared to yesterday"
                })

    # 2. Peak hours
    peak_row = db.execute(text("""
        SELECT hour_of_day, SUM(net_amount) AS rev
        FROM olap.fact_sales
        WHERE time_key = to_char(CURRENT_DATE,'YYYYMMDD')::INT
        GROUP BY hour_of_day ORDER BY rev DESC LIMIT 2
    """)).fetchall()
    if peak_row:
        hours = " and ".join([f"{r[0]:02d}:00" for r in peak_row])
        insights.append({"type": "info", "icon": "⏰", "text": f"Peak hours today: {hours}"})

    # 3. Low stock count
    low_count = db.execute(text("""
        SELECT COUNT(*) FROM oltp.inventory_current WHERE stock_level < 20
    """)).scalar()
    if low_count and low_count > 0:
        insights.append({
            "type": "warning",
            "icon": "⚠️",
            "text": f"{low_count} product(s) are running low on stock across all branches"
        })

    # 4. Best-selling product today
    best = db.execute(text("""
        SELECT dp.name, SUM(fs.quantity) AS units
        FROM olap.fact_sales fs
        JOIN olap.dim_product dp ON dp.product_key = fs.product_key
        WHERE fs.time_key = to_char(CURRENT_DATE,'YYYYMMDD')::INT
        GROUP BY dp.name ORDER BY units DESC LIMIT 1
    """)).fetchone()
    if best:
        insights.append({"type": "info", "icon": "🏆", "text": f"Best seller today: {best[0]} ({best[1]} units)"})

    return insights or [{"type": "info", "icon": "ℹ️", "text": "No data available for today yet"}]


# ─────────────────────────────────────────────────────
# CORE ENTITIES
# ─────────────────────────────────────────────────────

@app.get("/api/branches")
def get_branches(db: Session = Depends(database.get_db)):
    results = db.query(models.Branch).all()
    return [{"id": r.id, "name": r.name} for r in results]

@app.get("/api/system/data-quality")
def run_data_quality_checks(db: Session = Depends(database.get_db)):
    results = db.execute(text("SELECT * FROM olap.run_data_quality_checks()")).fetchall()
    return [{"check_name": r[0], "status": r[1], "details": r[2]} for r in results]
