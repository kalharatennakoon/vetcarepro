# VetCare Pro ML Infrastructure Setup Guide

## Phase 1: ML Infrastructure - Complete! ✅

### What Was Implemented

1. **Python ML Environment Setup**
   - Updated `requirements.txt` with all necessary libraries (scikit-learn, pandas, numpy, Prophet, Flask)
   - Created virtual environment structure
   - Added environment configuration

2. **Database Connection Pipeline**
   - Created `config/db_connection.py` for PostgreSQL connections
   - Implemented context manager for safe database operations
   - Added connection pooling support

3. **Data Loading Utilities**
   - Created `utils/data_loader.py` with methods to extract:
     - Sales/billing data for forecasting
     - Inventory transaction data for demand prediction
     - Disease case data for outbreak prediction
     - Medical records for analysis
     - Appointment data for trends

4. **Base ML Model Framework**
   - Created `utils/model_base.py` as abstract base class
   - Implemented model save/load functionality
   - Added model versioning support

5. **Flask API Server**
   - Created `app.py` as REST API server for ML services
   - Implemented health check endpoints
   - Set up placeholder endpoints for:
     - Disease prediction
     - Sales forecasting
     - Inventory demand forecasting
   - Added data loading test endpoints

6. **Node.js Integration**
   - Created `server/src/services/mlService.js` for ML service communication
   - Created `server/src/controllers/mlController.js` for request handling
   - Created `server/src/routes/mlRoutes.js` for API routing
   - Integrated ML routes into main Express app
   - Added axios for HTTP requests to ML service

---

## Quick Start Guide

### Step 1: Install Python Dependencies

```bash
cd ml
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your database credentials
nano .env  # or your preferred editor
```

Update the following in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=postgres
DB_PASSWORD=your_password
```

### Step 3: Test ML Infrastructure

```bash
# Run infrastructure tests
python test_setup.py
```

Expected output:
```
✓ Database connection successful!
✓ Loaded X sales records
✓ Loaded X inventory transaction records
...
🎉 All tests passed! ML infrastructure is ready.
```

### Step 4: Start ML Service

```bash
# Option 1: Using startup script
./start.sh

# Option 2: Manually
python app.py
```

The ML service will start on `http://localhost:5001`

### Step 5: Install Node.js Dependencies

```bash
cd ../server
npm install  # This will install axios and other dependencies
```

### Step 6: Update Server Environment

Add to `server/.env`:
```
ML_SERVICE_URL=http://localhost:5001
```

### Step 7: Test Integration

```bash
# Start the Node.js server (in server directory)
npm run dev

# In another terminal, test ML service health
curl http://localhost:3000/api/ml/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "VetCare Pro ML Service",
  "version": "1.0.0"
}
```

---

## API Endpoints

### Health & Status
- `GET /api/ml/health` - ML service health check
- `GET /api/ml/models/status` - Get status of all ML models
- `GET /api/ml/test/db-connection` - Test database connection (Admin only)

### Data Loading (Testing)
- `GET /api/ml/data/sales?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Load sales data
- `GET /api/ml/data/inventory` - Load inventory data

### Disease Prediction (Placeholder - Phase 2)
- `POST /api/ml/disease/predict` - Predict disease outbreak
- `GET /api/ml/disease/trends` - Get disease trends

### Sales Forecasting (Placeholder - Phase 3)
- `POST /api/ml/sales/forecast` - Forecast sales
- `GET /api/ml/sales/trends` - Get sales trends

### Inventory Forecasting (Placeholder - Phase 3)
- `POST /api/ml/inventory/forecast` - Forecast inventory demand
- `GET /api/ml/inventory/reorder-suggestions` - Get reorder suggestions

---

## Project Structure

```
ml/
├── app.py                      # Flask API server
├── requirements.txt            # Python dependencies
├── start.sh                    # Startup script
├── test_setup.py              # Infrastructure test script
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
├── README.md                  # ML service documentation
├── config/
│   ├── __init__.py
│   └── db_connection.py       # Database connection utility
├── utils/
│   ├── __init__.py
│   ├── data_loader.py         # Data extraction utilities
│   └── model_base.py          # Base ML model class
├── scripts/                   # ML model implementations (Phase 2 & 3)
│   ├── disease_prediction.py
│   ├── sales_forecasting.py
│   └── inventory_forecasting.py
├── models/                    # Saved trained models
│   └── .gitkeep
└── data/                      # Training data cache
    └── .gitkeep

server/src/
├── services/
│   └── mlService.js          # ML service integration
├── controllers/
│   └── mlController.js       # ML request handlers
└── routes/
    └── mlRoutes.js           # ML API routes
```

---

## Testing Commands

```bash
# Test database connection
curl http://localhost:5001/api/ml/test/db-connection

# Check ML service health
curl http://localhost:5001/api/ml/health

# Load sales data (via Python ML service)
curl http://localhost:5001/api/ml/data/sales

# Check models status (via Node.js proxy)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/ml/models/status
```

---

## Common Issues & Solutions

### Issue: "ModuleNotFoundError: No module named 'prophet'"
**Solution:** Make sure virtual environment is activated and dependencies are installed:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: "Connection refused" when testing ML service
**Solution:** Make sure ML service is running:
```bash
cd ml
python app.py
```

### Issue: "Database connection failed"
**Solution:** Check your `.env` file has correct database credentials and PostgreSQL is running:
```bash
psql -U postgres -d vetcarepro -c "SELECT 1"
```

### Issue: "Module 'axios' not found" in Node.js
**Solution:** Install Node.js dependencies:
```bash
cd server
npm install
```

---

## Next Steps

### Phase 2: Disease Prediction ML (Coming Soon)
- Populate disease_cases table from medical records
- Train disease outbreak prediction model
- Implement pandemic risk assessment
- Build disease trend visualization

### Phase 3: Sales & Inventory Forecasting ML (Coming Soon)
- Populate daily_sales_summary table
- Train time-series forecasting models
- Implement inventory demand prediction
- Build predictive dashboards

---

## Development Tips

1. **Keep ML service running during development:**
   ```bash
   cd ml && ./start.sh
   ```

2. **Monitor ML service logs:**
   Flask will show all requests and errors in the terminal

3. **Test new models independently:**
   Create test scripts in `ml/scripts/` directory before integrating

4. **Use the data loader:**
   Always use `DataLoader` class methods for consistent data extraction

5. **Model versioning:**
   Models are automatically versioned by date when saved

---

## Security Notes

- ML service runs on localhost by default
- All Node.js ML endpoints require JWT authentication
- Database credentials stored in `.env` (never commit!)
- Admin-only endpoints restricted via role-based access control

---

## Resources

- [scikit-learn Documentation](https://scikit-learn.org/)
- [Prophet Documentation](https://facebook.github.io/prophet/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [pandas Documentation](https://pandas.pydata.org/)

---

**Status:** Phase 1 Complete ✅  
**Next:** Implement Disease Prediction Models (Phase 2)
