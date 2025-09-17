# Local Flexibility Trading Service

## General Information and Purpose

### Service Name/Title
Local Flexibility Trading Service

### Description and Purpose
The Trading Service enables the trading of flexibility services to maintain grid stability and ensure efficient market operations.  
It involves interactions between **System Operators (SO)**, **Market Operators (MO)**, and **Flexibility Service Providers (FSP)**.  

Key processes include:  
- Submitting flexibility requests  
- Assessing trade feasibility  
- Market clearing  
- Settling results  

This service ensures efficient grid management and proper market operations through coordinated information exchange.

### Owner/Contact Information
**Hellenic Energy Exchange (HEnEx)**

---

## Functional Requirements

- **Submit Flexibility Request** – SOs can identify grid flexibility needs and submit requests to the Local Flexibility Market (LFM).  
- **Evaluate Request** – Notify qualified FSPs about SO’s requests; FSPs use AI/decision-making tools to evaluate.  
- **Send Flexibility Offer** – FSPs can submit flexibility offers to the LFM.  
- **Financial Feasibility Checks** – MO performs financial checks on orders.  
- **Network Feasibility Checks** – SOs perform network feasibility validation.  
- **Alternative Path for Rejections** – Rejection/failure messages are sent if feasibility fails.  
- **Market Clearing** – Handle clearing and send results to involved partners.  
- **Settlement** – Manage settlement process after delivery, integrating with SOs and smart meters for remuneration.  
- **Notification System** – Notify FSPs of requests and results.  
- **Data Exchange and Coordination** – Ensure efficient SO–MO–FSP coordination.  
- **User Authentication and Authorization** – Secure mechanisms with RBAC.  
- **Audit Logging** – Full logs of all actions for auditing.  

---

## Non-Functional Requirements

### Performance
- Response Time: Process requests quickly.  
- Throughput: Handle high transaction volumes.  

### Reliability and Availability
- High uptime  
- Failover and reliability mechanisms  

### Security
- Authentication: Strong methods  
- Authorization: RBAC  
- Data Encryption: Encrypt data in transit and at rest  
- Data Privacy: GDPR-compliant  

### Other Considerations
- Scalability: Handle increased load  
- Maintainability: Easy updates and maintenance  
- Monitoring and Logging: Comprehensive monitoring  

---

## Service Interfaces

### API Endpoints

#### Endpoint 1 – Create a new timeframe
- **URL:** `timeframe/create`  
- **Method:** `POST`  
- **Description:** Creates Market Time Units (MTUs) and Trading Windows for a specific date.  
- **Headers:**  
  - `Content-Type: application/json`  
  - `Authorization: Bearer <token>`  

**Request Parameters**  
- `date` (string, format: YYYY-MM-DD)  

**Request Example**
```json
POST /timeframe/create
{
  "date": "2023-01-01"
}
```

**Response Example**
```json
{
  "mtu_id": 1,
  "mtu_from": "2023-01-01T00:00:00Z",
  "mtu_to": "2023-01-01T01:00:00Z",
  "tradingWindow": {
    "twd_id": 1,
    "twd_from": "2022-12-31T22:00:00Z",
    "twd_to": "2022-12-31T23:00:00Z"
  }
}
```

**Error Handling**  
- 400 Bad Request  
- 401 Unauthorized  
- 409 Conflict  
- 404 Not Found  
- 500 Internal Server Error  

---

#### Endpoint 2 – List Trading Windows
- **URL:** `/timeframe/trading-windows/list`  
- **Method:** `GET`  
- **Description:** Retrieve list of Trading Windows, optionally filtered by date range.  

**Request Example**
```http
GET /timeframe/trading-windows/list?from=2023-01-01&to=2023-01-02
```

**Response Example**
```json
[
  {
    "twd_id": 1,
    "twd_from": "2022-12-31T22:00:00Z",
    "twd_to": "2022-12-31T23:00:00Z",
    "twd_date_created": "2023-01-01T00:00:00Z",
    "twd_date_updated": "2023-01-01T00:00:00Z",
    "twd_fk_mtu_id": {
      "mtu_id": 1,
      "mtu_from": "2023-01-01T00:00:00Z",
      "mtu_to": "2023-01-01T01:00:00Z",
      "mtu_on_closure_procedure": false
    }
  }
]
```

**Error Handling**  
- 400 Bad Request  
- 401 Unauthorized  
- 500 Internal Server Error  

---

#### Endpoint 3 – List MTUs
- **URL:** `/timeframe/mtus/list`  
- **Method:** `GET`  

**Request Example**
```http
GET /timeframe/mtus/list?date=2023-01-01
```

**Response Example**
```json
[
  {
    "mtu_id": 1,
    "mtu_from": "2023-01-01T00:00:00Z",
    "mtu_to": "2023-01-01T01:00:00Z",
    "mtu_on_closure_procedure": false
  }
]
```

**Error Handling**  
- 400 Bad Request  
- 401 Unauthorized  
- 500 Internal Server Error  

---

#### Endpoint 4 – Get MTU by ID
- **URL:** `/timeframe/mtus/:id`  
- **Method:** `GET`  

**Request Example**
```http
GET /timeframe/mtus/1
```

**Response Example**
```json
{
  "mtu_id": 1,
  "mtu_from": "2023-01-01T00:00:00Z",
  "mtu_to": "2023-01-01T01:00:00Z"
}
```

**Error Handling**  
- 400 Bad Request  
- 401 Unauthorized  
- 404 Not Found  
- 500 Internal Server Error  

---

#### Endpoint 5 – List Orders
- **URL:** `/order/list`  
- **Method:** `GET`  

**Request Example**
```http
GET /order/list?mtu_ids=1,2,3&cmpId=5
```

**Response Example**
```json
[
  {
    "ord_id": 1,
    "ord_name": "Power Purchase Order",
    "ord_direction": "BUY",
    "ord_status": "ACTIVE"
  }
]
```

**Error Handling**  
- 400 Bad Request  
- 401 Unauthorized  
- 500 Internal Server Error  

---

#### Endpoint 6 – Create Order
- **URL:** `/order`  
- **Method:** `POST`  

**Request Example**
```json
{
  "ord_name": "Power Purchase Order",
  "ord_direction": "BUY",
  "ord_price_quantity_pairs": [
    { "price": 45.50, "quantity": 10 }
  ],
  "mtu_id": 1,
  "company_id": 5,
  "portfolio_id": 3,
  "node_id": 2
}
```

**Response Example**
```json
{
  "ord_id": 1,
  "ord_name": "Power Purchase Order",
  "ord_direction": "BUY",
  "ord_status": "ACTIVE"
}
```

**Error Handling**  
- 400 Bad Request  
- 404 Not Found  
- 500 Internal Server Error  

---

#### Endpoint 7 – Delete Order
- **URL:** `/order/:id`  
- **Method:** `DELETE`  

**Request Example**
```http
DELETE /order/1
```

**Response Example**
```http
200 OK
```

**Error Handling**  
- 400 Bad Request  
- 404 Not Found  
- 500 Internal Server Error  

---

#### Endpoint 8 – Update Order
- **URL:** `/order/:id`  
- **Method:** `PATCH`  

**Request Example**
```json
PATCH /order/1
{
  "ord_name": "Updated Order Name"
}
```

**Response Example**
```json
{
  "ord_id": 1,
  "ord_name": "Updated Order Name",
  "ord_status": "ACTIVE"
}
```

**Error Handling**  
- 400 Bad Request  
- 404 Not Found  
- 401 Unauthorized  
- 500 Internal Server Error  

---

#### Endpoint 9 – Get Aggregated Curve for MTU
- **URL:** `/aggregated-curves/mtu/:mtu_id`  
- **Method:** `GET`  

**Request Example**
```http
GET /aggregated-curves/mtu/1
```

**Response Example**
```json
{
  "mtu": { "mtu_id": 1 },
  "curves": {
    "BUY": [{ "agcp_id": 1, "agcp_price": 45.50 }],
    "SELL": [{ "agcp_id": 3, "agcp_price": 50.75 }]
  }
}
```

**Error Handling**  
- 400 Bad Request  
- 404 Not Found  
- 500 Internal Server Error  

---

## Data Model

### Entities and Relationships

#### Company
- Represents an organization participating in the platform  
- Owns Assets, Portfolios, and places Orders  
- Identified by VAT  

#### Node
- Physical/logical grid location  
- Links to Assets, Portfolios, and Orders  

#### Asset
- Represents generator, battery, or meter  
- Linked to Company, Portfolio, Node  

#### Portfolio
- Grouping of assets owned by a company  
- Used to submit Orders  

#### Order
- Represents a bid/offer  
- Contains price/quantity pairs  
- Linked to Company, Portfolio, Node, MTU  

#### Aggregated Curve Point
- Represents a supply/demand curve point  
- Linked to MTU, Node, optionally Order  

#### MTU (Market Time Unit)
- Specific 15-min trading interval  
- One-to-one with Trading Window  

#### Trading Window
- Defines start/end of a session for each MTU  

---

## Integration and Dependencies

- External dependencies  
- System dependencies  
- Third-party integrations  
- HEDGE-IOT Edge Devices/cloud integration  
- App Store integration  
- Data space integration  

---

## Security and Privacy

- **Data Sensitivity** – All market/trade data is sensitive  
- **Access Control** – RBAC enforced  
- **Audit Logs** – All actions logged  

---

Initial experimentation verified:  
- Service flows with demo data/use cases  
- Market request/response handling  
- Settlement and notifications  
- Results confirmed system feasibility  
