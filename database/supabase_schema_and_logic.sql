-- Drop existing tables to ensure a clean slate
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- 1. Schema Definitions
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    traffic_weight INT NOT NULL DEFAULT 1 
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    base_price NUMERIC(10, 2) NOT NULL,
    popularity_weight INT NOT NULL DEFAULT 1
);

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    stock_level INT NOT NULL DEFAULT 0,
    last_restocked TIMESTAMP,
    UNIQUE(branch_id, product_id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_orders_branch ON orders(branch_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- 2. Core Business Logic (Stored Procedures)

-- Function to pick a branch weighted by traffic_weight
CREATE OR REPLACE FUNCTION get_random_branch_id() RETURNS INT AS $$
DECLARE
    v_branch_id INT;
BEGIN
    SELECT id INTO v_branch_id
    FROM branches
    ORDER BY -LOG(RANDOM()) / traffic_weight
    LIMIT 1;
    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to pick a product weighted by popularity_weight
CREATE OR REPLACE FUNCTION get_random_product_id() RETURNS INT AS $$
DECLARE
    v_product_id INT;
BEGIN
    SELECT id INTO v_product_id
    FROM products
    ORDER BY -LOG(RANDOM()) / popularity_weight
    LIMIT 1;
    RETURN v_product_id;
END;
$$ LANGUAGE plpgsql;

-- Generates a highly realistic single order
CREATE OR REPLACE FUNCTION generate_single_order(p_timestamp TIMESTAMP) RETURNS INT AS $$
DECLARE
    v_branch_id INT;
    v_order_id INT;
    v_num_items INT;
    v_product RECORD;
    v_quantity INT;
    v_is_promo BOOLEAN;
    v_order_total NUMERIC(10, 2) := 0;
    v_discount NUMERIC(10, 2) := 0;
    v_subtotal NUMERIC(10, 2);
BEGIN
    SELECT id INTO v_branch_id
    FROM branches
    ORDER BY -LOG(RANDOM() + 0.000001) / traffic_weight
    LIMIT 1;
    
    INSERT INTO orders (branch_id, created_at) 
    VALUES (v_branch_id, p_timestamp) 
    RETURNING id INTO v_order_id;
    
    v_num_items := floor(random() * 4 + 1)::INT; -- 1 to 4 unique items per order
    
    FOR i IN 1..v_num_items LOOP
        -- Safe random product selection (avoids volatile function in WHERE clause bug)
        SELECT id, base_price INTO v_product 
        FROM products 
        ORDER BY -LOG(RANDOM() + 0.000001) / popularity_weight 
        LIMIT 1;
        
        v_quantity := floor(random() * 3 + 1)::INT; -- 1 to 3 items per product
        v_subtotal := v_product.base_price * v_quantity;
        
        -- Promotion logic: Random discount/buy-1-get-1 logic applied at item level
        v_is_promo := RANDOM() < 0.15; -- 15% chance
        IF v_is_promo THEN
            -- Simulating a 50% discount on the item
            v_discount := v_discount + (v_subtotal * 0.5);
        END IF;

        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES (v_order_id, v_product.id, v_quantity, v_product.base_price, v_subtotal);
        
        v_order_total := v_order_total + v_subtotal;
        
        -- Inventory Evening Consumption / Realtime update
        UPDATE inventory 
        SET stock_level = stock_level - v_quantity 
        WHERE branch_id = v_branch_id AND product_id = v_product.id;
    END LOOP;
    
    -- Finalize order totals
    UPDATE orders 
    SET total_amount = v_order_total, discount_amount = v_discount 
    WHERE id = v_order_id;
    
    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql;

-- Generates thousands of historical orders matching time/day patterns
CREATE OR REPLACE FUNCTION seed_historical_orders(p_start_date DATE, p_end_date DATE, p_base_orders_per_day INT) RETURNS VOID AS $$
DECLARE
    v_current_date DATE;
    v_is_weekend BOOLEAN;
    v_daily_orders INT;
    v_hour INT;
    v_minute INT;
    v_timestamp TIMESTAMP;
    v_hour_weight NUMERIC;
BEGIN
    v_current_date := p_start_date;
    
    WHILE v_current_date <= p_end_date LOOP
        -- Morning Restock Rules
        UPDATE inventory 
        SET stock_level = stock_level + 500, last_restocked = (v_current_date + interval '6 hours')::TIMESTAMP;
    
        v_is_weekend := EXTRACT(DOW FROM v_current_date) IN (0, 6);
        v_daily_orders := p_base_orders_per_day;
        
        -- Weekend boost logic
        IF v_is_weekend THEN
            v_daily_orders := (v_daily_orders * 1.5)::INT;
        END IF;
        
        FOR i IN 1..v_daily_orders LOOP
            v_hour_weight := RANDOM();
            -- Distribution: Peak hours get the highest weight
            IF v_hour_weight < 0.35 THEN
                v_hour := floor(random() * 3 + 11)::INT; -- Lunch peak 11-13
            ELSIF v_hour_weight < 0.75 THEN
                v_hour := floor(random() * 4 + 18)::INT; -- Dinner peak 18-21
            ELSE
                v_hour := floor(random() * 10 + 8)::INT; -- Rest of the day
            END IF;
            
            v_minute := floor(random() * 60)::INT;
            v_timestamp := v_current_date + make_interval(hours := v_hour, mins := v_minute);
            
            PERFORM generate_single_order(v_timestamp);
        END LOOP;
        
        v_current_date := v_current_date + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Simple trigger for Python script to call per second
CREATE OR REPLACE FUNCTION trigger_realtime_order() RETURNS INT AS $$
BEGIN
    RETURN generate_single_order(NOW()::TIMESTAMP);
END;
$$ LANGUAGE plpgsql;
