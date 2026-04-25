-- ====================================================================
-- F&B PLATFORM - DATA ENGINEERING UPGRADE
-- Advanced OLAP | Data Quality Checks | Analytics Views
-- ====================================================================

-- 1. ADD COST PRICE TO OLTP PRODUCTS
ALTER TABLE oltp.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2) DEFAULT 0;
UPDATE oltp.products SET cost_price = base_price * 0.4 WHERE cost_price = 0 OR cost_price IS NULL;

-- 2. ENHANCE OLAP SCHEMA

-- Drop existing if we are altering their structure
DROP TABLE IF EXISTS olap.fact_orders_daily CASCADE;
DROP TABLE IF EXISTS olap.fact_inventory CASCADE;

ALTER TABLE olap.fact_sales ADD COLUMN IF NOT EXISTS hour_of_day INT;
ALTER TABLE olap.fact_sales ADD COLUMN IF NOT EXISTS day_of_week INT;
ALTER TABLE olap.fact_sales ADD COLUMN IF NOT EXISTS cost_amount NUMERIC(10, 2);

-- Fact: Inventory (Snapshot of stock over time)
CREATE TABLE olap.fact_inventory (
    fact_id SERIAL PRIMARY KEY,
    time_key INT REFERENCES olap.dim_time(time_key),
    branch_key INT REFERENCES olap.dim_branch(branch_key),
    product_key INT REFERENCES olap.dim_product(product_key),
    closing_stock INT,
    total_restocked INT,
    total_consumed INT
);

-- Fact: Orders Daily (Aggregated)
CREATE TABLE olap.fact_orders_daily (
    fact_id SERIAL PRIMARY KEY,
    time_key INT REFERENCES olap.dim_time(time_key),
    branch_key INT REFERENCES olap.dim_branch(branch_key),
    total_orders INT,
    total_gross NUMERIC(10, 2),
    total_discount NUMERIC(10, 2),
    total_net NUMERIC(10, 2),
    total_cost NUMERIC(10, 2)
);

-- 3. ENHANCED ETL PROCESS
CREATE OR REPLACE FUNCTION olap.refresh_star_schema() RETURNS VOID AS $$
BEGIN
    -- Update Time Dimension
    INSERT INTO olap.dim_time (time_key, full_date, day_of_week, day_name, month, month_name, quarter, year, is_weekend)
    SELECT DISTINCT 
        to_char(created_at, 'YYYYMMDD')::INT,
        DATE(created_at),
        EXTRACT(ISODOW FROM created_at),
        to_char(created_at, 'Day'),
        EXTRACT(MONTH FROM created_at),
        to_char(created_at, 'Month'),
        EXTRACT(QUARTER FROM created_at),
        EXTRACT(YEAR FROM created_at),
        EXTRACT(ISODOW FROM created_at) IN (6, 7)
    FROM oltp.orders
    ON CONFLICT (full_date) DO NOTHING;

    -- Update Branch Dimension 
    INSERT INTO olap.dim_branch (branch_id, name)
    SELECT id, name FROM oltp.branches
    ON CONFLICT (branch_id) DO UPDATE SET name = EXCLUDED.name;

    -- Update Product Dimension
    INSERT INTO olap.dim_product (product_id, name, category)
    SELECT id, name, category FROM oltp.products
    ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

    -- Refresh fact_sales
    TRUNCATE TABLE olap.fact_sales CASCADE;
    
    INSERT INTO olap.fact_sales (time_key, branch_key, product_key, order_id, quantity, gross_amount, discount_amount, net_amount, cost_amount, hour_of_day, day_of_week)
    SELECT 
        to_char(o.created_at, 'YYYYMMDD')::INT as time_key,
        b.branch_key,
        p.product_key,
        o.id as order_id,
        oi.quantity,
        (oi.unit_price * oi.quantity) as gross_amount,
        (o.discount_amount * ((oi.unit_price * oi.quantity) / NULLIF(o.gross_amount, 0))) as discount_amount,
        ((oi.unit_price * oi.quantity) - (o.discount_amount * ((oi.unit_price * oi.quantity) / NULLIF(o.gross_amount, 0)))) as net_amount,
        (pr.cost_price * oi.quantity) as cost_amount,
        EXTRACT(HOUR FROM o.created_at)::INT as hour_of_day,
        EXTRACT(ISODOW FROM o.created_at)::INT as day_of_week
    FROM oltp.order_items oi
    JOIN oltp.orders o ON o.id = oi.order_id
    JOIN oltp.products pr ON pr.id = oi.product_id
    JOIN olap.dim_branch b ON b.branch_id = o.branch_id
    JOIN olap.dim_product p ON p.product_id = oi.product_id;

    -- Refresh fact_orders_daily
    TRUNCATE TABLE olap.fact_orders_daily;
    INSERT INTO olap.fact_orders_daily (time_key, branch_key, total_orders, total_gross, total_discount, total_net, total_cost)
    SELECT 
        time_key,
        branch_key,
        COUNT(DISTINCT order_id) as total_orders,
        SUM(gross_amount) as total_gross,
        SUM(discount_amount) as total_discount,
        SUM(net_amount) as total_net,
        SUM(cost_amount) as total_cost
    FROM olap.fact_sales
    GROUP BY time_key, branch_key;

    -- Refresh fact_inventory (using logs to aggregate daily changes)
    TRUNCATE TABLE olap.fact_inventory;
    INSERT INTO olap.fact_inventory (time_key, branch_key, product_key, total_restocked, total_consumed, closing_stock)
    SELECT 
        to_char(l.created_at, 'YYYYMMDD')::INT as time_key,
        b.branch_key,
        p.product_key,
        SUM(CASE WHEN l.reason = 'RESTOCK' THEN l.change_amount ELSE 0 END) as total_restocked,
        SUM(CASE WHEN l.reason = 'CONSUMPTION' THEN ABS(l.change_amount) ELSE 0 END) as total_consumed,
        MAX(l.new_stock_level) as closing_stock
    FROM oltp.inventory_logs l
    JOIN olap.dim_branch b ON b.branch_id = l.branch_id
    JOIN olap.dim_product p ON p.product_id = l.product_id
    GROUP BY to_char(l.created_at, 'YYYYMMDD')::INT, b.branch_key, p.product_key;

END;
$$ LANGUAGE plpgsql;

-- 4. ADVANCED ANALYTICS VIEWS

-- Revenue by hour (Peak detection)
CREATE OR REPLACE VIEW olap.vw_revenue_by_hour AS
SELECT 
    hour_of_day,
    SUM(net_amount) as total_revenue,
    COUNT(DISTINCT order_id) as total_orders
FROM olap.fact_sales
GROUP BY hour_of_day
ORDER BY hour_of_day;

-- Top Products per Branch
CREATE OR REPLACE VIEW olap.vw_top_products_branch AS
SELECT 
    b.name as branch_name,
    p.name as product_name,
    SUM(f.quantity) as total_units_sold,
    SUM(f.net_amount) as total_revenue,
    RANK() OVER (PARTITION BY b.name ORDER BY SUM(f.quantity) DESC) as rank
FROM olap.fact_sales f
JOIN olap.dim_branch b ON b.branch_key = f.branch_key
JOIN olap.dim_product p ON p.product_key = f.product_key
GROUP BY b.name, p.name;

-- Inventory Turnover Rate (COGS / Average Inventory)
CREATE OR REPLACE VIEW olap.vw_inventory_turnover AS
SELECT 
    b.name as branch_name,
    p.name as product_name,
    SUM(fs.cost_amount) as "Cost of Goods Sold",
    COALESCE(AVG(fi.closing_stock), 1) as avg_inventory,
    (SUM(fs.cost_amount) / NULLIF(AVG(fi.closing_stock), 0)) as turnover_rate
FROM olap.fact_sales fs
JOIN olap.dim_branch b ON b.branch_key = fs.branch_key
JOIN olap.dim_product p ON p.product_key = fs.product_key
LEFT JOIN olap.fact_inventory fi ON fi.branch_key = fs.branch_key AND fi.product_key = fs.product_key
GROUP BY b.name, p.name;

-- Profit Margin View
CREATE OR REPLACE VIEW olap.vw_profit_margin AS
SELECT 
    time_key,
    b.name as branch_name,
    total_net as revenue,
    total_cost as cost,
    (total_net - total_cost) as profit,
    CASE WHEN total_net > 0 THEN ((total_net - total_cost) / total_net) * 100 ELSE 0 END as profit_margin_percent
FROM olap.fact_orders_daily f
JOIN olap.dim_branch b ON b.branch_key = f.branch_key;

-- Branch Performance Ranking
CREATE OR REPLACE VIEW olap.vw_branch_performance AS
SELECT 
    b.name as branch_name,
    SUM(f.total_net) as total_revenue,
    SUM(f.total_orders) as total_orders,
    SUM(f.total_net - f.total_cost) as total_profit,
    RANK() OVER (ORDER BY SUM(f.total_net) DESC) as revenue_rank
FROM olap.fact_orders_daily f
JOIN olap.dim_branch b ON b.branch_key = f.branch_key
GROUP BY b.name;

-- 5. DATA QUALITY CHECKS (SQL Engine)
CREATE OR REPLACE FUNCTION olap.run_data_quality_checks() 
RETURNS TABLE(check_name VARCHAR, status VARCHAR, details TEXT) AS $$
DECLARE
    v_count INT;
BEGIN
    -- Check 1: Negative Stock
    SELECT COUNT(*) INTO v_count FROM oltp.inventory_current WHERE stock_level < 0;
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'Negative Stock Check'::VARCHAR, 'FAILED'::VARCHAR, 'Found ' || v_count || ' items with negative stock.'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Negative Stock Check'::VARCHAR, 'PASSED'::VARCHAR, 'All stock levels >= 0.'::TEXT;
    END IF;

    -- Check 2: Orphaned Order Items (Missing FK)
    -- Postgres enforces FKs, but we check if constraints were disabled
    SELECT COUNT(*) INTO v_count FROM oltp.order_items WHERE order_id NOT IN (SELECT id FROM oltp.orders);
    IF v_count > 0 THEN
        RETURN QUERY SELECT 'FK Integrity (Order Items)'::VARCHAR, 'FAILED'::VARCHAR, 'Found ' || v_count || ' orphaned order items.'::TEXT;
    ELSE
        RETURN QUERY SELECT 'FK Integrity (Order Items)'::VARCHAR, 'PASSED'::VARCHAR, 'All order items have valid parent orders.'::TEXT;
    END IF;

    -- Check 3: Abnormal Spikes (e.g. > 10,000 orders in a single day for a branch)
    SELECT MAX(total_orders) INTO v_count FROM olap.fact_orders_daily;
    IF v_count > 10000 THEN
        RETURN QUERY SELECT 'Abnormal Spike Check'::VARCHAR, 'WARNING'::VARCHAR, 'Max orders/day detected is ' || v_count || ', exceeds 10,000 threshold.'::TEXT;
    ELSE
        RETURN QUERY SELECT 'Abnormal Spike Check'::VARCHAR, 'PASSED'::VARCHAR, 'Max orders/day is ' || COALESCE(v_count,0) || ', within normal limits.'::TEXT;
    END IF;
    
END;
$$ LANGUAGE plpgsql;
