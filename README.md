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
├── supabase_enterprise_schema.sql      # Core OLTP & OLAP Schemas
├── supabase_olap_upgrades.sql          # Advanced Analytics Views & DQ Engine
├── supabase_auth_employees.sql         # RBAC Auth Triggers
└── docker-compose.yml                  # Kafka, Zookeeper, MinIO
```

## How to Run

### 1. Database Setup
Ensure you have a Supabase project. The `data_ingestion/db_driven_seeder.py` script will automatically drop and recreate the optimal Database structure and populate it with 30 days of historical data.
```bash
python data_ingestion/db_driven_seeder.py
```

### 2. Start the Backend API
```bash
uvicorn backend.app.main:app --reload
```

### 3. Start the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```

### 4. (Optional) Run Real-Time Streaming
Start your Docker containers (Kafka, MinIO), then start the POS Producer and Spark Consumer:
```bash
python data_streaming/kafka_producer.py
python data_streaming/spark_streaming_consumer.py
```
