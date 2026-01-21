# API Documentation

Base URL: `http://localhost:8000`

## 1. Ingest Data

Ingest arbitrary JSON data for asynchronous processing.

*   **URL**: `/api/data/ingest`
*   **Method**: `POST`
*   **Content-Type**: `application/json`

### Request Body Schema
The payload must specific keys but allows for flexible `details`.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `string` | Yes | Unique identifier for the user. |
| `event_type` | `string` | Yes | Type of event (e.g., "login", "purchase"). |
| `timestamp` | `string` | No | ISO 8601 date string. Defaults to server time if omitted. |
| `details` | `object` | No | Additional flexible data payload. |

### Example Request
```json
{
  "user_id": "user_12345",
  "event_type": "page_view",
  "timestamp": "2023-10-27T10:00:00Z",
  "details": {
    "url": "/home",
    "referrer": "google.com"
  }
}
```

### Success Response
*   **Code**: `202 Accepted`
*   **Content**:
    ```json
    {
      "status": "accepted",
      "message_id": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```

### Error Responses
*   **Code**: `400 Bad Request`
    *   **Reason**: Invalid JSON payload or missing required fields.
    *   **Content**: `{"error": "\"user_id\" is required"}`
*   **Code**: `500 Internal Server Error`
    *   **Reason**: Failed to publish message to the queue (e.g., RabbitMQ down).

---

## 2. Get Dead Letters

Retrieve messages that failed processing multiple times and were moved to the Dead-Letter Queue (DLQ).

*   **URL**: `/api/dead-letters`
*   **Method**: `GET`

### Query Parameters
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `limit` | `integer` | 10 | Maximum number of messages to retrieve. |

### Success Response
*   **Code**: `200 OK`
*   **Content**:
    ```json
    {
      "count": 1,
      "messages": [
        {
          "message_id": "550e8400-e29b-41d4-a716-446655440000",
          "content": {
            "message_id": "550e8400-e29b-41d4-a716-446655440000",
            "timestamp": "2023-10-27T10:00:00Z",
            "data": { ... }
          },
          "fields": {
            "consumerTag": "...",
            "deliveryTag": 1,
            "redelivered": false,
            "exchange": "",
            "routingKey": "ingest_dlq"
          }
        }
      ]
    }
    ```

---

## 3. Health Check

Check if the API service is running.

*   **URL**: `/health`
*   **Method**: `GET`

### Success Response
*   **Code**: `200 OK`
*   **Content**: `{"status": "ok"}`
