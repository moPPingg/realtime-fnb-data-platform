# F&B Real-Time Data Platform 

This is a **Production-Grade Data Engineering Ecosystem** for a Food & Beverage (F&B) chain. It seamlessly integrates Real-Time Transaction Processing (OLTP), High-Speed Analytics (OLAP), Data Lakes, and Machine Learning pipelines into a unified platform.

## Core Architecture & Features

### 1. Database-First Design (Supabase / PostgreSQL)
*   **OLTP (Online Transaction Processing)**: A strictly normalized (3NF) relational schema (`oltp.orders`, `oltp.branches`, `oltp.products`). Includes advanced triggers for 100% automated inventory tracking (`oltp.inventory_logs`).
*   **OLAP (Online Analytical Processing)**: A classic Kimball Star Schema (`olap.fact_sales`, `olap.dim_time`) fueled by an internal SQL ETL function, reducing dashboard query times from seconds to milliseconds.
*   **RBAC & Authentication**: Built-in Role-Based Access Control mapped directly to Supabase Auth (`oltp.employees`).

### 2. Big Data & Real-Time Streaming
*   **Apache Kafka**: Replaces direct DB writes. POS terminals push JSON transactions to Kafka, acting as a high-velocity buffer.
*   **Spark Structured Streaming**: Consumes from Kafka, micro-batches every 5 seconds, performs in-memory aggregations, detects low-stock/traffic spikes, and safely persists to Supabase.
*   **Data Lake (MinIO + PySpark)**: Batch processing jobs (`minio_spark_job.py`) extract data to S3 buckets, deduplicate it, compute rolling 7-day windows, and save Machine Learning Features back to Postgres (`ml.ml_features`).

### 3. Backend & API (FastAPI)
*   Hyper-fast RESTful API connecting the frontend directly to the OLAP Database.
*   Endpoints for `revenue-by-hour`, `top-products`, `inventory-alert`, and `data-quality-checks`.

### 4. Supabase Real-Time (WebSockets)
*   The system uses Postgres Replication to automatically broadcast database changes (INSERTs) via WebSockets straight to the Frontend React Dashboard, without needing a custom socket.io server.

---

## Project Structure

```text
.
├── backend/
│   └── app/
│       ├── main.py                     # FastAPI Endpoints
│       ├── models.py                   # SQLAlchemy Models (OLAP/OLTP)
│       └── database.py                 # DB Connection
├── data_ingestion/
│   ├── db_driven_seeder.py             # Fake Data generator & Schema installer
│   └── realistic_generator.py          # Python faker logic
├── data_processing/
│   ├── minio_spark_job.py              # PySpark Batch & Feature Engineering
│   └── spark_job.py                    
├── data_streaming/
│   ├── kafka_producer.py               # Edge-node POS Simulator
│   └── spark_streaming_consumer.py     # Micro-batch Stream Processor
├── frontend/                           # React + Vite Dashboard
├── database/                           # PostgreSQL / Supabase Scripts
│   ├── supabase_enterprise_schema.sql  # Core OLTP & OLAP Schemas
│   ├── supabase_olap_upgrades.sql      # Advanced Analytics Views & DQ Engine
│   ├── supabase_auth_employees.sql     # RBAC Auth Triggers
│   └── supabase_ml_features.sql        # ML Feature Store Schema
└── docker/                             # Infrastructure (Kafka, Zookeeper, MinIO, Spark)
```

## How to Run

### 1. Prerequisites & Environment
Ensure you have a Supabase project and a `.env` file in the root directory with the following variables:
- `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`

### 2. Infrastructure Setup (Docker)
Since **Apache Spark and Kafka** have complex dependencies on Windows, the entire streaming and batch processing stack is containerized.
```bash
# Start Kafka, Zookeeper, MinIO, and Spark Workers
cd docker
docker-compose up -d
```
This will start:
- **Kafka & Zookeeper**: For real-time event streaming.
- **MinIO**: As a local S3-compatible Data Lake.
- **Spark Consumer**: Automatically starts processing Kafka streams.

### 3. Database Initialization
Run the seeder to install the OLTP/OLAP schemas and populate historical data:
```bash
# Activate virtual environment
.\venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run seeder
python data_ingestion/db_driven_seeder.py
```

### 4. Start the Backend API (FastAPI)
The backend provides the analytics engine for the dashboard.
```bash
cd backend
# Ensure venv is active
uvicorn app.main:app --reload
```

### 5. Start the Frontend Dashboard (React)
A real-time dashboard with Recharts and Supabase Realtime integration.
```bash
cd frontend
npm install
npm run dev
```

---

## Dashboard Features
The new **Production Dashboard** includes:
- **Real-time KPI Cards**: Revenue, Orders, and AOV updated via WebSockets.
- **Business Insights**: Automatic detection of peak hours and revenue anomalies.
- **Inventory Alerts**: Real-time tracking of low-stock items with severity levels.
- **Multi-Branch View**: Role-based access for Managers to compare performance across all branches.
