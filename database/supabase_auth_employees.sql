-- ====================================================================
-- F&B PLATFORM - AUTHENTICATION & EMPLOYEES (RBAC)
-- ====================================================================

-- 1. Create Employees Table
CREATE TABLE IF NOT EXISTS oltp.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Maps to auth.users.id
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('STAFF', 'MANAGER')),
    branch_id INT REFERENCES oltp.branches(id),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON oltp.employees FOR EACH ROW EXECUTE FUNCTION oltp.set_updated_at();

-- 2. Function to map Supabase Auth User to Employee on creation
-- (Assumes employee_code is stored in auth.users user_metadata)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO oltp.employees (id, employee_code, name, role, branch_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'employee_code',
    NEW.raw_user_meta_data->>'name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'STAFF'),
    (NEW.raw_user_meta_data->>'branch_id')::INT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Seed Initial Employees
INSERT INTO oltp.employees (id, employee_code, name, role, branch_id)
VALUES 
    (gen_random_uuid(), 'MGR001', 'Alice Admin', 'MANAGER', NULL),
    (gen_random_uuid(), 'STF001', 'Bob Staff', 'STAFF', 1),
    (gen_random_uuid(), 'STF002', 'Charlie Staff', 'STAFF', 2)
ON CONFLICT (employee_code) DO NOTHING;

-- 4. Enable Supabase Realtime for Dashboard
-- Ensures that the React frontend receives websocket updates
ALTER PUBLICATION supabase_realtime ADD TABLE oltp.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE oltp.inventory_current;
