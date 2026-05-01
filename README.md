# F&B Real-Time Data Platform 

This is a **Production-Grade Data Engineering Ecosystem** for a Food & Beverage (F&B) chain. It integrates Real-Time Transaction Processing (OLTP), High-Speed Analytics (OLAP), Data Lakes, and Machine Learning pipelines into a unified platform.

## Core Architecture & Features

### 1. Database-First Design (Supabase / PostgreSQL)
*   **OLTP (Online Transaction Processing)**: Normalized (3NF) relational schema (`oltp` schema). Includes advanced triggers for 100% automated inventory tracking.
*   **OLAP (Online Analytical Processing)**: Kimball Star Schema (`olap` schema) fueled by an internal SQL ETL engine, reducing dashboard query times significantly.
*   **RBAC & Authentication**: Role-Based Access Control mapped directly to Supabase Auth.

### 2. Big Data & Real-Time Streaming
*   **Apache Kafka**: High-velocity message broker for POS transaction ingestion.
*   **Spark Structured Streaming**: Real-time consumption from Kafka, performing in-memory aggregations and persistence to Supabase.
*   **Data Lake (MinIO + PySpark)**: Batch processing jobs for deduplication, rolling window computations, and ML feature engineering.

### 3. Backend & API (FastAPI)
*   High-performance RESTful API connecting the frontend to the OLAP database.
*   Endpoints for revenue analytics, top products, inventory alerts, and data quality checks.

### 4. Real-Time Dashboard (React)
*   Modern analytics interface with Recharts.
*   Manual Refresh model for controlled data visibility and high-performance analytics.

---

## Featured Sub-Project: Mopping's Cafe
Located in `./moppings-cafe`, this is a management interface built with **Node.js, Express, and Socket.io**.
*   **RBAC & Permissions**: Dynamic role assignment (Admin, Manager, Staff).
*   **Live Inventory**: Real-time stock tracking and dashboard synchronization.

---

## Project Structure

```text
.
├── backend/
│   └── app/
│       ├── main.py                     # FastAPI Endpoints
│       ├── models.py                   # SQLAlchemy Models
│       └── database.py                 # DB Connection (via .env)
├── database/                           # PostgreSQL / Supabase Scripts
│   ├── supabase_enterprise_schema.sql  # Core OLTP & OLAP Schemas
│   ├── supabase_olap_upgrades.sql      # Analytics Views & DQ Engine
│   ├── supabase_auth_employees.sql     # RBAC Auth Triggers
│   └── supabase_ml_features.sql        # ML Feature Store Schema
├── data_ingestion/
│   └── db_driven_seeder.py             # Advanced Fake Data Generator & Schema Seeder
├── data_processing/
│   └── minio_spark_job.py              # PySpark Batch & Feature Engineering (MinIO -> DB)
├── data_streaming/
│   ├── kafka_producer.py               # POS Terminal Simulator (Edge Node)
│   └── spark_streaming_consumer.py     # Real-time Stream Processor (Kafka -> DB)
├── frontend/                           # React + Vite Dashboard
├── docker/                             # Infrastructure (Kafka, Zookeeper, MinIO, Spark)
└── .env                                # Environment Variables (Ignored by Git)
```

## How to Run

### 1. Prerequisites & Environment
Ensure you have a Supabase project and a `.env` file in the root directory with the following variables:
- `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_URL`
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `KAFKA_BROKER`

### 2. Infrastructure Setup (Docker)
Start the streaming and data lake stack:
```bash
cd docker
docker-compose up -d
```

### 3. Database Initialization & Seeding
Run the seeder to apply the schema and populate historical data:
```bash
# Setup virtual environment
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Run advanced seeder (Generates 90 days of history, 500 orders/day)
python data_ingestion/db_driven_seeder.py
```

### 4. Start Backend API
```bash
cd backend
uvicorn app.main:app --reload
```

### 5. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```

---

## Security & Cleanliness
- **Zero Hardcoded Secrets**: All credentials (DB, MinIO, Kafka) are loaded via environment variables.
- **Git Safety**: `.env` files are strictly excluded via `.gitignore`.
- **Clean Architecture**: Separation of concerns between Ingestion, Streaming, Processing, and Serving layers.
