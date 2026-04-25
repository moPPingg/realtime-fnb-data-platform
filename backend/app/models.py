from sqlalchemy import Column, Integer, String, Numeric, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID
import uuid
from .database import Base

# ==========================================
# OLAP Views (Analytics)
# ==========================================
class RevenueByHour(Base):
    __tablename__ = "vw_revenue_by_hour"
    __table_args__ = {'schema': 'olap'}
    hour_of_day = Column(Integer, primary_key=True)
    total_revenue = Column(Numeric)
    total_orders = Column(Integer)

class BranchPerformance(Base):
    __tablename__ = "vw_branch_performance"
    __table_args__ = {'schema': 'olap'}
    branch_name = Column(String, primary_key=True)
    total_revenue = Column(Numeric)
    total_orders = Column(Integer)
    total_profit = Column(Numeric)
    revenue_rank = Column(Integer)

class DailyRevenue(Base):
    __tablename__ = "daily_revenue" # Deprecated view but keeping for backward compatibility
    __table_args__ = {'schema': 'olap'}
    sale_date = Column(Date, primary_key=True)
    branch_id = Column(Integer, primary_key=True)
    revenue = Column(Numeric)
    total_discount = Column(Numeric)
    order_count = Column(Integer)

class ProductPerformance(Base):
    __tablename__ = "product_performance" # Deprecated view but keeping for backward compatibility
    __table_args__ = {'schema': 'olap'}
    name = Column(String, primary_key=True)
    category = Column(String)
    units_sold = Column(Numeric)
    total_revenue = Column(Numeric)

# ==========================================
# OLTP Tables (Core Data)
# ==========================================
class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = {'schema': 'oltp'}
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_code = Column(String, unique=True)
    name = Column(String)
    role = Column(String)
    branch_id = Column(Integer)
    status = Column(String)

class Branch(Base):
    __tablename__ = "branches"
    __table_args__ = {'schema': 'oltp'}
    id = Column(Integer, primary_key=True)
    name = Column(String)
    traffic_weight = Column(Integer)

class InventoryCurrent(Base):
    __tablename__ = "inventory_current"
    __table_args__ = {'schema': 'oltp'}
    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer)
    product_id = Column(Integer)
    stock_level = Column(Integer)
    last_updated = Column(DateTime)
