# VetCare Pro ML Service

Machine Learning service for VetCare Pro veterinary clinic management system.

## Features

- Disease outbreak prediction
- Sales forecasting
- Inventory demand forecasting

## Setup

### 1. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=postgres
DB_PASSWORD=your_password

FLASK_PORT=5001
FLASK_DEBUG=True
```

### 4. Start the Service

```bash
# Using the startup script
chmod +x start.sh
./start.sh

# Or manually
python app.py
```

The ML service will start on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET /api/ml/health
```

### Test Database Connection
```
GET /api/ml/test/db-connection
```

### Models Status
```
GET /api/ml/models/status
```

### Data Loading (for testing)
```
GET /api/ml/data/sales?start_date=2024-01-01&end_date=2024-12-31
GET /api/ml/data/inventory
```

## Project Structure

```
ml/
├── app.py                  # Flask API server
├── requirements.txt        # Python dependencies
├── start.sh               # Startup script
├── .env.example           # Environment template
├── config/
│   ├── __init__.py
│   └── db_connection.py   # Database connection utility
├── utils/
│   ├── __init__.py
│   ├── data_loader.py     # Data extraction utilities
│   └── model_base.py      # Base ML model class
├── scripts/               # ML model implementations
│   ├── disease_prediction.py
│   ├── sales_forecasting.py
│   └── inventory_forecasting.py
├── models/                # Saved trained models
└── data/                  # Training data cache
```

## Development

### Adding New Models

Extend the `BaseMLModel` class in `utils/model_base.py`:

```python
from utils.model_base import BaseMLModel

class MyModel(BaseMLModel):
    def __init__(self):
        super().__init__('my_model')
    
    def train(self, data):
        # Training logic
        pass
    
    def predict(self, data):
        # Prediction logic
        pass
```

### Testing

```bash
# Test database connection
curl http://localhost:5001/api/ml/test/db-connection

# Check service health
curl http://localhost:5001/api/ml/health

# Load sales data
curl http://localhost:5001/api/ml/data/sales
```

## Integration with Node.js Backend

The ML service communicates with the main Node.js backend through REST APIs. The Node.js server acts as a proxy between the frontend and the ML service.

See `server/src/services/mlService.js` for integration examples.
