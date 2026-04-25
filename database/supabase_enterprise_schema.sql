-- ====================================================================
-- F&B PLATFORM - ENTERPRISE DATA WAREHOUSE & OLTP SCHEMA
-- ====================================================================

CREATE SCHEMA IF NOT EXISTS oltp;
CREATE SCHEMA IF NOT EXISTS olap;

-- Idempotent drops
DROP TABLE IF EXISTS olap.fact_sales CASCADE;
DROP TABLE IF EXISTS olap.dim_time CASCADE;
DROP TABLE IF EXISTS olap.dim_branch CASCADE;
DROP TABLE IF EXISTS olap.dim_product CASCADE;
DROP TABLE IF EXISTS oltp.inventory_logs CASCADE;
DROP TABLE IF EXISTS oltp.audit_logs CASCADE;
DROP TABLE IF EXISTS oltp.order_items CASCADE;
DROP TABLE IF EXISTS oltp.orders CASCADE;
DROP TABLE IF EXISTS oltp.inventory_current CASCADE;
DROP TABLE IF EXISTS oltp.products CASCADE;
DROP TABLE IF EXISTS oltp.branches CASCADE;

-- ==========================================
-- 0. UTILITY: AUTOMATIC UPDATED_AT TRIGGER
-- ==========================================
CREATE OR REPLACE FUNCTION oltp.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 1. OLTP SCHEMA (Strictly Normalized)
-- ==========================================
CREATE TABLE oltp.branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    traffic_weight INT NOT NULL DEFAULT 1 CHECK (traffic_weight >= 1),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_branches_updated_at BEFORE UPDATE ON oltp.branches FOR EACH ROW EXECUTE FUNCTION oltp.set_updated_at();

CREATE TABLE oltp.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    popularity_weight INT NOT NULL DEFAULT 1 CHECK (popularity_weight >= 1),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON oltp.products FOR EACH ROW EXECUTE FUNCTION oltp.set_updated_at();

CREATE TABLE oltp.orders (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES oltp.branches(id) ON DELETE CASCADE,
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON oltp.orders FOR EACH ROW EXECUTE FUNCTION oltp.set_updated_at();

CREATE TABLE oltp.order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES oltp.orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES oltp.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON oltp.order_items FOR EACH ROW EXECUTE FUNCTION oltp.set_updated_at();

CREATE TABLE oltp.inventory_current (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES oltp.branches(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES oltp.products(id) ON DELETE CASCADE,
    stock_level INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON oltp.inventory_current FOR EACH ROW EXECUTE FUNCTION oltp.set_updated_at();

CREATE TABLE oltp.inventory_logs (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES oltp.branches(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES oltp.products(id) ON DELETE CASCADE,
    change_amount INT NOT NULL,
    new_stock_level INT NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('RESTOCK', 'CONSUMPTION', 'ADJUSTMENT')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 2. OLAP SCHEMA (Star Schema for Analytics)
-- ==========================================
CREATE TABLE olap.dim_time (
    time_key INT PRIMARY KEY, -- format: YYYYMMDD
    full_date DATE NOT NULL UNIQUE,
    day_of_week INT,
    day_name VARCHAR(20),
    month INT,
    month_name VARCHAR(20),
    quarter INT,
    year INT,
    is_weekend BOOLEAN
);

CREATE TABLE olap.dim_branch (
    branch_key SERIAL PRIMARY KEY,
    branch_id INT NOT NULL UNIQUE,
    name VARCHAR(255),
    valid_from TIMESTAMP DEFAULT NOW(),
    is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE olap.dim_product (
    product_key SERIAL PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    name VARCHAR(255),
    category VARCHAR(100),
    valid_from TIMESTAMP DEFAULT NOW(),
    is_current BOOLEAN DEFAULT TRUE
);

CREATE TABLE olap.fact_sales (
    fact_id SERIAL PRIMARY KEY,
    time_key INT REFERENCES olap.dim_time(time_key),
    branch_key INT REFERENCES olap.dim_branch(branch_key),
    product_key INT REFERENCES olap.dim_product(product_key),
    order_id INT, 
    quantity INT,
    gross_amount NUMERIC(10, 2),
    discount_amount NUMERIC(10, 2),
    net_amount NUMERIC(10, 2)
);

-- Indexes for OLAP and OLTP
CREATE INDEX idx_orders_created_at ON oltp.orders(created_at);
CREATE INDEX idx_orders_branch_id ON oltp.orders(branch_id);
CREATE INDEX idx_order_items_order_id ON oltp.order_items(order_id);
CREATE INDEX idx_inventory_current_branch_product ON oltp.inventory_current(branch_id, product_id);
CREATE INDEX idx_fact_sales_time ON olap.fact_sales(time_key);
CREATE INDEX idx_fact_sales_branch ON olap.fact_sales(branch_key);
CREATE INDEX idx_fact_sales_product ON olap.fact_sales(product_key);

-- ==========================================
-- 3. ETL FUNCTION (OLTP -> OLAP)
-- ==========================================
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

    -- Update Branch Dimension (SCD Type 1 for simplicity)
    INSERT INTO olap.dim_branch (branch_id, name)
    SELECT id, name FROM oltp.branches
    ON CONFLICT (branch_id) DO UPDATE SET name = EXCLUDED.name;

    -- Update Product Dimension
    INSERT INTO olap.dim_product (product_id, name, category)
    SELECT id, name, category FROM oltp.products
    ON CONFLICT (product_id) DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category;

    -- Refresh Fact Table (Full Reload for Demo, Incremental in Production)
    TRUNCATE TABLE olap.fact_sales;
    
    INSERT INTO olap.fact_sales (time_key, branch_key, product_key, order_id, quantity, gross_amount, discount_amount, net_amount)
    SELECT 
        to_char(o.created_at, 'YYYYMMDD')::INT as time_key,
        b.branch_key,
        p.product_key,
        o.id as order_id,
        oi.quantity,
        (oi.unit_price * oi.quantity) as gross_amount,
        -- Apportion discount across items based on subtotal ratio
        (o.discount_amount * ((oi.unit_price * oi.quantity) / NULLIF(o.gross_amount, 0))) as discount_amount,
        ((oi.unit_price * oi.quantity) - (o.discount_amount * ((oi.unit_price * oi.quantity) / NULLIF(o.gross_amount, 0)))) as net_amount
    FROM oltp.order_items oi
    JOIN oltp.orders o ON o.id = oi.order_id
    JOIN olap.dim_branch b ON b.branch_id = o.branch_id
    JOIN olap.dim_product p ON p.product_id = oi.product_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. PARTITIONING STRATEGY (Commented out for future scaling)
-- ==========================================
/*
For >10 million rows, replace oltp.orders with a partitioned table:

CREATE TABLE oltp.orders_partitioned (
    id SERIAL,
    branch_id INT NOT NULL,
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at) -- Primary key MUST include partition key
) PARTITION BY RANGE (created_at);

CREATE TABLE oltp.orders_2026_h1 PARTITION OF oltp.orders_partitioned FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
CREATE TABLE oltp.orders_2026_h2 PARTITION OF oltp.orders_partitioned FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');

Note: Foreign keys from `order_items` referencing `orders_partitioned` would require `order_items` to store `order_created_at` to establish the constraint properly in Postgres.
*/

-- ==========================================
-- 5. TRIGGERS & UTILITY LOGIC 
-- ==========================================
CREATE OR REPLACE FUNCTION oltp.audit_inventory_changes() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_level <> OLD.stock_level THEN
        INSERT INTO oltp.inventory_logs (branch_id, product_id, change_amount, new_stock_level, reason)
        VALUES (
            NEW.branch_id, 
            NEW.product_id, 
            NEW.stock_level - OLD.stock_level, 
            NEW.stock_level,
            CASE WHEN NEW.stock_level > OLD.stock_level THEN 'RESTOCK' ELSE 'CONSUMPTION' END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_inventory
AFTER UPDATE ON oltp.inventory_current
FOR EACH ROW
EXECUTE FUNCTION oltp.audit_inventory_changes();

CREATE OR REPLACE FUNCTION oltp.random_normal(mean NUMERIC, stddev NUMERIC) RETURNS NUMERIC AS $$
BEGIN
    RETURN mean + stddev * sqrt(-2 * ln(random() + 0.000001)) * cos(2 * pi() * random());
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE TABLE oltp.audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    records_affected INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 6. SEEDING LOGIC
-- ==========================================
CREATE OR REPLACE FUNCTION oltp.seed_master_data(p_branches JSON, p_products JSON) RETURNS VOID AS $$
BEGIN
    INSERT INTO oltp.branches (name, traffic_weight)
    SELECT value->>'name', (value->>'traffic_weight')::INT FROM json_array_elements(p_branches) ON CONFLICT (name) DO NOTHING;

    INSERT INTO oltp.products (name, category, base_price, popularity_weight)
    SELECT value->>'name', value->>'category', (value->>'base_price')::NUMERIC, (value->>'popularity_weight')::INT FROM json_array_elements(p_products) ON CONFLICT (name) DO NOTHING;

    INSERT INTO oltp.inventory_current (branch_id, product_id, stock_level)
    SELECT b.id, p.id, 10000 FROM oltp.branches b CROSS JOIN oltp.products p ON CONFLICT (branch_id, product_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION oltp.seed_historical_orders_bulk(p_start_date DATE, p_end_date DATE, p_base_orders_per_day INT) RETURNS VOID AS $$
DECLARE
    v_total_orders INT;
BEGIN
    CREATE TEMP TABLE tmp_orders ON COMMIT DROP AS
    WITH dates AS (SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE as d),
    daily_counts AS (SELECT d, CASE WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN (p_base_orders_per_day * 1.5)::INT ELSE p_base_orders_per_day END as num_orders FROM dates),
    order_series AS (SELECT d, generate_series(1, num_orders) as o_idx FROM daily_counts),
    order_timestamps AS (
        SELECT d + make_interval(hours := CASE WHEN random() < 0.40 THEN floor(oltp.random_normal(12, 1.0))::INT WHEN random() < 0.85 THEN floor(oltp.random_normal(19, 1.5))::INT ELSE floor(random() * 10 + 8)::INT END, mins := floor(random() * 60)::INT) as created_at
        FROM order_series
    )
    SELECT (SELECT id FROM oltp.branches ORDER BY -LOG(RANDOM() + 0.000001) / traffic_weight LIMIT 1) as branch_id, created_at FROM order_timestamps;

    CREATE TEMP TABLE tmp_inserted_orders ON COMMIT DROP AS
    WITH inserted AS (INSERT INTO oltp.orders (branch_id, created_at) SELECT branch_id, created_at FROM tmp_orders RETURNING id, branch_id) SELECT * FROM inserted;

    CREATE TEMP TABLE tmp_order_items ON COMMIT DROP AS
    WITH item_series AS (SELECT id as order_id, branch_id, generate_series(1, floor(random()*3 + 1)::INT) as item_idx FROM tmp_inserted_orders),
    items_raw AS (SELECT order_id, branch_id, (SELECT id FROM oltp.products ORDER BY -LOG(RANDOM() + 0.000001) / popularity_weight LIMIT 1) as product_id, floor(random()*3 + 1)::INT as quantity, random() < 0.15 as is_promo FROM item_series)
    SELECT i.order_id, i.branch_id, i.product_id, i.quantity, p.base_price as unit_price, CASE WHEN i.is_promo THEN (p.base_price * i.quantity * 0.5) ELSE 0 END as discount
    FROM items_raw i JOIN oltp.products p ON p.id = i.product_id;

    INSERT INTO oltp.order_items (order_id, product_id, quantity, unit_price) SELECT order_id, product_id, quantity, unit_price FROM tmp_order_items;

    UPDATE oltp.orders o SET gross_amount = agg.total, discount_amount = agg.discount FROM (SELECT order_id, SUM(quantity * unit_price) as total, SUM(discount) as discount FROM tmp_order_items GROUP BY order_id) agg WHERE o.id = agg.order_id;
    UPDATE oltp.inventory_current i SET stock_level = i.stock_level - agg.total_qty FROM (SELECT branch_id, product_id, SUM(quantity) as total_qty FROM tmp_order_items GROUP BY branch_id, product_id) agg WHERE i.branch_id = agg.branch_id AND i.product_id = agg.product_id;

    SELECT count(*) INTO v_total_orders FROM tmp_inserted_orders;
    INSERT INTO oltp.audit_logs (event_type, description, records_affected) VALUES ('BULK_SEED', 'Generated historical orders.', v_total_orders);
    
    -- Refresh the Star Schema automatically!
    PERFORM olap.refresh_star_schema();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION oltp.trigger_realtime_order() RETURNS INT AS $$
DECLARE
    v_order_id INT;
BEGIN
    PERFORM oltp.seed_historical_orders_bulk(CURRENT_DATE, CURRENT_DATE, 1);
    SELECT MAX(id) INTO v_order_id FROM oltp.orders;
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
