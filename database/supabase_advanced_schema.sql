-- ====================================================================
-- F&B PLATFORM - DATA ENGINEERING OPTIMIZED SCHEMA
-- OLTP / OLAP Separation | Normalized | Audit Logs | Strict Constraints
-- ====================================================================

-- 1. SCHEMAS
CREATE SCHEMA IF NOT EXISTS oltp;
CREATE SCHEMA IF NOT EXISTS olap;

-- Idempotent drops
DROP TABLE IF EXISTS oltp.inventory_logs CASCADE;
DROP TABLE IF EXISTS oltp.audit_logs CASCADE;
DROP TABLE IF EXISTS oltp.order_items CASCADE;
DROP TABLE IF EXISTS oltp.orders CASCADE;
DROP TABLE IF EXISTS oltp.inventory_current CASCADE;
DROP TABLE IF EXISTS oltp.products CASCADE;
DROP TABLE IF EXISTS oltp.branches CASCADE;

-- 2. OLTP TABLES
CREATE TABLE oltp.branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    traffic_weight INT NOT NULL DEFAULT 1 CHECK (traffic_weight >= 1)
);

CREATE TABLE oltp.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100),
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    popularity_weight INT NOT NULL DEFAULT 1 CHECK (popularity_weight >= 1)
);

CREATE TABLE oltp.inventory_current (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES oltp.branches(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES oltp.products(id) ON DELETE CASCADE,
    stock_level INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

CREATE TABLE oltp.orders (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES oltp.branches(id) ON DELETE CASCADE,
    gross_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    -- net_amount is derived via OLAP views to remove redundancy
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE oltp.order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES oltp.orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES oltp.products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)
    -- subtotal is derived via OLAP views
);

-- Audit Tables
CREATE TABLE oltp.inventory_logs (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES oltp.branches(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES oltp.products(id) ON DELETE CASCADE,
    change_amount INT NOT NULL,
    new_stock_level INT NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('RESTOCK', 'CONSUMPTION', 'ADJUSTMENT')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE oltp.audit_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    records_affected INT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. INDEXES (Crucial for Performance)
CREATE INDEX idx_orders_created_at ON oltp.orders(created_at);
CREATE INDEX idx_orders_branch_id ON oltp.orders(branch_id);
CREATE INDEX idx_order_items_order_id ON oltp.order_items(order_id);
CREATE INDEX idx_inventory_current_branch_product ON oltp.inventory_current(branch_id, product_id);
CREATE INDEX idx_inventory_logs_created_at ON oltp.inventory_logs(created_at);

-- 4. OLAP VIEWS (Derived Fields & Aggregations)
CREATE OR REPLACE VIEW olap.item_subtotals AS
SELECT 
    id,
    order_id,
    product_id,
    quantity,
    unit_price,
    (quantity * unit_price) AS subtotal
FROM oltp.order_items;

CREATE OR REPLACE VIEW olap.order_revenue AS
SELECT 
    id AS order_id,
    branch_id,
    created_at,
    gross_amount,
    discount_amount,
    (gross_amount - discount_amount) AS net_amount
FROM oltp.orders;

CREATE OR REPLACE VIEW olap.daily_revenue AS
SELECT 
    DATE(o.created_at) AS sale_date,
    o.branch_id,
    SUM(o.gross_amount) AS total_gross,
    SUM(o.discount_amount) AS total_discount,
    SUM(o.gross_amount - o.discount_amount) AS net_revenue,
    COUNT(o.id) AS order_count
FROM oltp.orders o
GROUP BY DATE(o.created_at), o.branch_id;

CREATE OR REPLACE VIEW olap.product_performance AS
SELECT 
    p.name,
    p.category,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.quantity * oi.unit_price) AS total_gross_revenue
FROM oltp.order_items oi
JOIN oltp.products p ON p.id = oi.product_id
GROUP BY p.id, p.name, p.category;

-- 5. TRIGGERS
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

-- 6. UTILITY FUNCTIONS (Distributions & Randomness)
CREATE OR REPLACE FUNCTION oltp.random_normal(mean NUMERIC, stddev NUMERIC) RETURNS NUMERIC AS $$
BEGIN
    RETURN mean + stddev * sqrt(-2 * ln(random() + 0.000001)) * cos(2 * pi() * random());
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 7. BATCH DATA GENERATION & SEEDING

-- Idempotent Master Data Seed
CREATE OR REPLACE FUNCTION oltp.seed_master_data(p_branches JSON, p_products JSON) RETURNS VOID AS $$
BEGIN
    -- Branches
    INSERT INTO oltp.branches (name, traffic_weight)
    SELECT value->>'name', (value->>'traffic_weight')::INT
    FROM json_array_elements(p_branches)
    ON CONFLICT (name) DO NOTHING;

    -- Products
    INSERT INTO oltp.products (name, category, base_price, popularity_weight)
    SELECT value->>'name', value->>'category', (value->>'base_price')::NUMERIC, (value->>'popularity_weight')::INT
    FROM json_array_elements(p_products)
    ON CONFLICT (name) DO NOTHING;

    -- Inventory
    INSERT INTO oltp.inventory_current (branch_id, product_id, stock_level)
    SELECT b.id, p.id, 10000 
    FROM oltp.branches b CROSS JOIN oltp.products p
    ON CONFLICT (branch_id, product_id) DO NOTHING;

    INSERT INTO oltp.audit_logs (event_type, description, records_affected) 
    VALUES ('MASTER_DATA_SEED', 'Master data ensured idempotently via JSON input.', 1);
END;
$$ LANGUAGE plpgsql;

-- High-performance bulk historical seeder using generate_series and Temp Tables
CREATE OR REPLACE FUNCTION oltp.seed_historical_orders_bulk(p_start_date DATE, p_end_date DATE, p_base_orders_per_day INT) RETURNS VOID AS $$
DECLARE
    v_total_orders INT;
BEGIN
    CREATE TEMP TABLE tmp_orders ON COMMIT DROP AS
    WITH dates AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::DATE as d
    ),
    daily_counts AS (
        SELECT d, 
               CASE WHEN EXTRACT(DOW FROM d) IN (0, 6) THEN (p_base_orders_per_day * 1.5)::INT 
                    ELSE p_base_orders_per_day END as num_orders
        FROM dates
    ),
    order_series AS (
        SELECT d, generate_series(1, num_orders) as o_idx
        FROM daily_counts
    ),
    order_timestamps AS (
        SELECT 
            -- Normal distribution for peak hours (Lunch ~12 PM, Dinner ~19 PM)
            d + make_interval(
                   hours := CASE 
                                WHEN random() < 0.40 THEN floor(oltp.random_normal(12, 1.0))::INT 
                                WHEN random() < 0.85 THEN floor(oltp.random_normal(19, 1.5))::INT 
                                ELSE floor(random() * 10 + 8)::INT 
                            END,
                   mins := floor(random() * 60)::INT
            ) as created_at
        FROM order_series
    )
    SELECT 
        (SELECT id FROM oltp.branches ORDER BY -LOG(RANDOM() + 0.000001) / traffic_weight LIMIT 1) as branch_id,
        created_at
    FROM order_timestamps;

    -- Insert into real orders
    CREATE TEMP TABLE tmp_inserted_orders ON COMMIT DROP AS
    WITH inserted AS (
        INSERT INTO oltp.orders (branch_id, created_at)
        SELECT branch_id, created_at FROM tmp_orders
        RETURNING id, branch_id
    )
    SELECT * FROM inserted;

    -- Generate Items
    CREATE TEMP TABLE tmp_order_items ON COMMIT DROP AS
    WITH item_series AS (
        SELECT id as order_id, branch_id, generate_series(1, floor(random()*3 + 1)::INT) as item_idx
        FROM tmp_inserted_orders
    ),
    items_raw AS (
        SELECT 
            order_id, 
            branch_id,
            (SELECT id FROM oltp.products ORDER BY -LOG(RANDOM() + 0.000001) / popularity_weight LIMIT 1) as product_id,
            floor(random()*3 + 1)::INT as quantity,
            random() < 0.15 as is_promo
        FROM item_series
    )
    SELECT 
        i.order_id,
        i.branch_id,
        i.product_id,
        i.quantity,
        p.base_price as unit_price,
        CASE WHEN i.is_promo THEN (p.base_price * i.quantity * 0.5) ELSE 0 END as discount
    FROM items_raw i
    JOIN oltp.products p ON p.id = i.product_id;

    -- Insert items (subtotal removed from schema)
    INSERT INTO oltp.order_items (order_id, product_id, quantity, unit_price)
    SELECT order_id, product_id, quantity, unit_price
    FROM tmp_order_items;

    -- Update order totals in bulk (gross_amount, discount_amount)
    UPDATE oltp.orders o
    SET 
        gross_amount = agg.total,
        discount_amount = agg.discount
    FROM (
        SELECT order_id, SUM(quantity * unit_price) as total, SUM(discount) as discount
        FROM tmp_order_items
        GROUP BY order_id
    ) agg
    WHERE o.id = agg.order_id;

    -- Bulk update inventory (fires the audit trigger efficiently)
    UPDATE oltp.inventory_current i
    SET stock_level = i.stock_level - agg.total_qty,
        last_updated = NOW()
    FROM (
        SELECT branch_id, product_id, SUM(quantity) as total_qty
        FROM tmp_order_items
        GROUP BY branch_id, product_id
    ) agg
    WHERE i.branch_id = agg.branch_id AND i.product_id = agg.product_id;

    -- Log Audit
    SELECT count(*) INTO v_total_orders FROM tmp_inserted_orders;
    INSERT INTO oltp.audit_logs (event_type, description, records_affected) 
    VALUES ('BULK_SEED', 'Generated historical orders using generate_series batching.', v_total_orders);

END;
$$ LANGUAGE plpgsql;

-- Realtime Single Order Trigger
CREATE OR REPLACE FUNCTION oltp.trigger_realtime_order() RETURNS INT AS $$
DECLARE
    v_order_id INT;
BEGIN
    PERFORM oltp.seed_historical_orders_bulk(CURRENT_DATE, CURRENT_DATE, 1);
    SELECT MAX(id) INTO v_order_id FROM oltp.orders;
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;
