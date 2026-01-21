# Async Data Ingestion Service

A robust, event-driven backend system for asynchronous data ingestion and processing, built with **Node.js**, **Express**, **RabbitMQ**, and **PostgreSQL**.

## Architecture

1.  **Producer API (Node.js/Express)**:
    *   Ingests JSON data via `POST /api/data/ingest`.
    *   Validates payload using `Joi`.
    *   Publishes events to RabbitMQ `ingest_queue`.
    *   Exposes `GET /api/dead-letters` to inspect DLQ.

2.  **Message Queue (RabbitMQ)**:
    *   Buffers incoming tasks.
    *   Handles Dead-Letter Queue (DLQ) routing for failed messages.

3.  **Consumer Service (Node.js Worker)**:
    *   Consumes messages with `prefetch(1)`.
    *   Performs idempotent checks against Postgres.
    *   Simulates processing (e.g., uppercasing User IDs).
    *   Retries failed operations (3 attempts) before DLQing.

4.  **Database (PostgreSQL)**:
    *   Stores persistent `processed_events`.

## Prerequisites

*   Docker & Docker Compose

## Quick Start (One-Command Setup)

1.  Clone this repository.
2.  Run the stack:
    ```bash
    docker-compose up --build
    ```
3.  Wait for all services to be healthy (approx 30s). `consumer-service` and `producer-api` depend on `rabbitmq` and `db`.

## Usage / API Verification

### 1. Ingest Data
```bash
curl -X POST http://localhost:8000/api/data/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "alice",
    "event_type": "purchase",
    "details": {"amount": 50}
  }'
```
**Response:** `202 Accepted`

### 2. Verify Processing
Check the logs:
```bash
docker-compose logs -f consumer_service
```
You should see: `Message <uuid> processed successfully.`

Check the Database:
```bash
docker-compose exec db psql -U user -d processed_data -c "SELECT * FROM processed_events;"
```
You should see the record with `"user_id": "ALICE"`.

### 3. Test Dead-Letter Queue (DLQ)
To force a failure, you would typically modify the code to throw an error. If a message fails processing 3 times (simulated or real error), it goes to `ingest_dlq`.

View Dead Letters:
```bash
curl http://localhost:8000/api/dead-letters
```

## Running Tests

Unit tests are included for both services using Jest.

**Producer Tests:**
```bash
cd producer-api
npm install
npm test
```

**Consumer Tests:**
```bash
cd consumer-service
npm install
npm test
```

## Design Decisions
*   **Idempotency**: Checked via specific DB query on `message_id` before processing.
*   **Reliability**: `ack` is sent only after successful DB write. `nack` is sent on permanent failure.
*   **Retries**: Implemented with exponential backoff algorithm in application memory (for simplicity) before Nacking.
