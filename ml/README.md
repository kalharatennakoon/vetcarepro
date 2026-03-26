# VetCare Pro — ML Service

Machine Learning service for VetCare Pro veterinary clinic management system.
Runs as a separate Python/Flask process on port 5001, proxied via the Node.js backend.

## Features

- Disease activity prediction and outbreak risk assessment (Naive Bayes + K-Means)
- Sales revenue forecasting (Prophet + Random Forest)
- Inventory demand forecasting (Gradient Boosting)

---

## Setup

### 1. Create Virtual Environment

```bash
cd ml
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your database credentials (see `.env.example` for all variables).

### 4. Start the Service

```bash
# Recommended — uses venv Python automatically
./start.sh

# Or manually with venv Python
./venv/bin/python app.py
```

> **Important:** Always use `./venv/bin/python` or `./start.sh`. Running `python app.py` directly uses system Python which may be missing required packages (e.g. `prophet`).

The ML service starts on `http://localhost:5001`

---

## API Endpoints

### General
```
GET  /api/ml/health                  Health check
GET  /api/ml/models/status           Status of all trained models
GET  /api/ml/test/db-connection      Test database connection
```

### Disease Prediction
```
POST /api/ml/disease/train           Train model (admin only)
POST /api/ml/disease/predict         Predict disease category
POST /api/ml/disease/outbreak-risk   Disease activity risk assessment
GET  /api/ml/disease/patterns        Clustering pattern analysis
GET  /api/ml/disease/trends          Species-specific trends
GET  /api/ml/disease/geographic      Geographic distribution
GET  /api/ml/disease/forecast        Monthly activity forecast
```

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/disease/trends | jq
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/ml/disease/forecast?periods=12" | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/disease/patterns | jq
```

### Sales Forecasting
```
POST /api/ml/sales/train             Train model (admin only)
GET  /api/ml/sales/forecast          Revenue forecast (N days)
POST /api/ml/sales/predict-month     Predict specific month revenue
GET  /api/ml/sales/trends            Historical trends and seasonality
GET  /api/ml/sales/top-services      Top revenue-generating services
```

```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:5001/api/ml/sales/forecast?periods=60" | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/sales/trends | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/sales/top-services | jq
```

### Inventory Demand Forecasting
```
POST /api/ml/inventory/train         Train model (admin only)
POST /api/ml/inventory/forecast      30-day demand forecast per item
GET  /api/ml/inventory/reorder-suggestions  Reorder alerts (urgent/soon/sufficient)
GET  /api/ml/inventory/fast-moving   Fast/slow-moving item analysis
GET  /api/ml/inventory/category-analysis    Demand by category
POST /api/ml/inventory/predict-restock      Predict stockout date per item
```

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/inventory/reorder-suggestions | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/inventory/fast-moving | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:5001/api/ml/inventory/category-analysis | jq
```

---

## Project Structure

```
ml/
├── app.py                          # Flask API server
├── requirements.txt                # Python dependencies
├── start.sh                        # Startup script (uses venv)
├── test_setup.py                   # Infrastructure test script
├── .env                            # Environment variables (not committed)
├── .env.example                    # Environment template
├── config/
│   └── db_connection.py            # PostgreSQL connection utility
├── utils/
│   ├── data_loader.py              # Data extraction from PostgreSQL
│   └── model_base.py               # Base ML model class
├── scripts/
│   ├── disease_prediction.py       # Naive Bayes + K-Means disease model
│   ├── sales_forecasting.py        # Prophet + Random Forest sales model
│   ├── inventory_forecasting.py    # Gradient Boosting inventory model
│   ├── pet_health_predictor.py     # Pet health prediction model
│   └── data_migration/
│       └── extract_disease_cases.py  # One-time disease case migration script
├── models/                         # Saved trained model files (.pkl) — gitignored
└── data/                           # Training data cache — gitignored
```

---

## Integration with Node.js Backend

The ML service communicates with the Node.js backend through REST APIs. Node.js acts as a proxy — the frontend never calls the ML service directly.

See `server/src/services/mlService.js` for integration details.
