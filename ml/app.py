"""
Flask API Server for ML Services
Provides REST API endpoints for machine learning predictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import glob
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'True') == 'True'
app.config['PORT'] = int(os.getenv('FLASK_PORT', 5001))

# Global ML model instances
disease_model = None
sales_model = None
inventory_model = None


def load_disease_model():
    """Load the disease prediction model"""
    global disease_model
    
    try:
        from scripts.disease_prediction import DiseasePredictionModel
        import joblib
        
        disease_model = DiseasePredictionModel()
        
        # Get the absolute path to models directory
        app_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(app_dir, 'models')
        
        # Try to load the latest saved model
        model_pattern = os.path.join(models_dir, 'disease_prediction_*.pkl')
        model_files = glob.glob(model_pattern)
        
        if model_files:
            latest_model = max(model_files)
            print(f"Loading disease prediction model: {latest_model}")
            loaded_data = joblib.load(latest_model)
            
            # Restore model components
            disease_model.model = loaded_data
            disease_model.classification_model = loaded_data.get('classification_model')
            disease_model.clustering_model = loaded_data.get('clustering_model')
            disease_model.label_encoders = loaded_data.get('label_encoders', {})
            disease_model.scaler = loaded_data.get('scaler')
            disease_model.training_date = loaded_data.get('training_date')
            disease_model.data_size = loaded_data.get('data_size', 0)
            disease_model.species_distribution = loaded_data.get('species_distribution', {})
            disease_model.category_distribution = loaded_data.get('category_distribution', {})
            
            print(f"✓ Disease model loaded successfully (trained on {disease_model.data_size} cases)")
            return True
        else:
            print(f"⚠️  No trained disease model found in {models_dir}")
            print("   Train the model by running: python scripts/disease_prediction.py")
            return False
            
    except Exception as e:
        print(f"❌ Error loading disease model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def load_sales_model():
    """Load the sales forecasting model"""
    global sales_model

    try:
        from scripts.sales_forecasting import SalesForecastingModel
        import joblib

        sales_model = SalesForecastingModel()

        # Get the absolute path to models directory
        app_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(app_dir, 'models')

        # Try to load the latest saved model
        model_pattern = os.path.join(models_dir, 'sales_forecasting_*.pkl')
        model_files = glob.glob(model_pattern)

        if model_files:
            latest_model = max(model_files)
            print(f"Loading sales forecasting model: {latest_model}")
            loaded_data = joblib.load(latest_model)

            # Restore model components
            sales_model.prophet_model = loaded_data.get('prophet_model')
            sales_model.demand_model = loaded_data.get('demand_model')
            sales_model.scaler = loaded_data.get('scaler')
            sales_model.feature_columns = loaded_data.get('feature_columns', [])
            sales_model.training_data = loaded_data.get('training_data', {})

            import pandas as pd
            monthly_records = loaded_data.get('monthly_summary', [])
            if monthly_records:
                sales_model.monthly_summary = pd.DataFrame(monthly_records)

            print(f"✓ Sales forecasting model loaded successfully")
            return True
        else:
            print(f"⚠️  No trained sales model found in {models_dir}")
            print("   Train the model via POST /api/ml/sales/train")
            return False

    except Exception as e:
        print(f"❌ Error loading sales model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def load_inventory_model():
    """Load the inventory forecasting model"""
    global inventory_model

    try:
        from scripts.inventory_forecasting import InventoryForecastingModel
        import joblib

        inventory_model = InventoryForecastingModel()

        # Get the absolute path to models directory
        app_dir = os.path.dirname(os.path.abspath(__file__))
        models_dir = os.path.join(app_dir, 'models')

        # Try to load the latest saved model
        model_pattern = os.path.join(models_dir, 'inventory_forecasting_*.pkl')
        model_files = glob.glob(model_pattern)

        if model_files:
            latest_model = max(model_files)
            print(f"Loading inventory forecasting model: {latest_model}")
            loaded_data = joblib.load(latest_model)

            # Restore model components
            inventory_model.demand_model = loaded_data.get('demand_model')
            inventory_model.scaler = loaded_data.get('scaler')
            inventory_model.feature_columns = loaded_data.get('feature_columns', [])
            inventory_model.item_stats = loaded_data.get('item_stats', {})
            inventory_model.category_map = loaded_data.get('category_map', {})

            item_count = len(inventory_model.item_stats)
            print(f"✓ Inventory forecasting model loaded successfully ({item_count} items)")
            return True
        else:
            print(f"⚠️  No trained inventory model found in {models_dir}")
            print("   Train the model via POST /api/ml/inventory/train")
            return False

    except Exception as e:
        print(f"❌ Error loading inventory model: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


# Load models at startup
print("\n" + "=" * 60)
print("  VetCare Pro ML Service - Starting Up")
print("=" * 60)
load_disease_model()
load_sales_model()
load_inventory_model()
print("=" * 60 + "\n")


# ===========================================================================
# HEALTH & STATUS ENDPOINTS
# ===========================================================================

@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'VetCare Pro ML Service',
        'version': '3.0.0'
    }), 200


@app.route('/api/ml/models/status', methods=['GET'])
def get_models_status():
    """Get status of all ML models"""
    try:
        models_status = {
            'disease_prediction': {
                'loaded': disease_model is not None and disease_model.model is not None,
                'trained': disease_model is not None and disease_model.classification_model is not None,
                'data_size': disease_model.data_size if disease_model else 0,
                'training_date': disease_model.training_date.isoformat() if disease_model and disease_model.training_date else None,
                'confidence': disease_model.get_model_confidence() if disease_model else None
            },
            'sales_forecasting': {
                'loaded': sales_model is not None,
                'trained': sales_model is not None and (
                    sales_model.prophet_model is not None or sales_model.demand_model is not None
                ),
                'training_data': sales_model.training_data if sales_model else {}
            },
            'inventory_forecasting': {
                'loaded': inventory_model is not None,
                'trained': inventory_model is not None and inventory_model.demand_model is not None,
                'items_tracked': len(inventory_model.item_stats) if inventory_model else 0
            }
        }

        return jsonify({
            'success': True,
            'models': models_status
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# DISEASE PREDICTION ENDPOINTS (Phase 2 — unchanged)
# ===========================================================================

@app.route('/api/ml/disease/predict', methods=['POST'])
def predict_disease():
    """
    Predict disease category from symptoms and characteristics

    Request body:
    {
        "species": "Dog",
        "breed": "Labrador",
        "age_at_diagnosis": 36,
        "severity": "moderate",
        "is_contagious": false
    }
    """
    try:
        if not disease_model or not disease_model.classification_model:
            return jsonify({
                'success': False,
                'message': 'Disease prediction model not trained yet'
            }), 503

        data = request.get_json()

        # Validate required fields
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Make prediction
        result = disease_model.predict(data)

        return jsonify({
            'success': True,
            'prediction': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/disease/outbreak-risk', methods=['POST'])
def assess_outbreak_risk():
    """
    Assess disease outbreak risk based on recent cases

    Query params or body:
    - species (optional): Filter by species
    - disease_category (optional): Filter by disease category
    - region (optional): Filter by region
    - days_lookback (optional): Number of days to analyze (default: 30)
    """
    try:
        if not disease_model:
            return jsonify({
                'success': False,
                'message': 'Disease prediction model not loaded'
            }), 503

        # Get parameters from query string or JSON body
        if request.is_json:
            data = request.get_json()
        else:
            data = request.args.to_dict()

        species = data.get('species')
        disease_category = data.get('disease_category')
        region = data.get('region')
        days_lookback = int(data.get('days_lookback', 30))

        # Assess risk
        risk_assessment = disease_model.predict_outbreak_risk(
            species=species,
            disease_category=disease_category,
            region=region,
            days_lookback=days_lookback
        )

        return jsonify({
            'success': True,
            'risk_assessment': risk_assessment
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/disease/patterns', methods=['GET'])
def analyze_disease_patterns():
    """Analyze disease patterns using clustering"""
    try:
        if not disease_model or not disease_model.clustering_model:
            return jsonify({
                'success': False,
                'message': 'Disease clustering model not trained yet'
            }), 503

        patterns = disease_model.analyze_patterns()

        return jsonify({
            'success': True,
            'patterns': patterns
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/disease/trends', methods=['GET'])
def get_disease_trends():
    """
    Get disease trends by species

    Query params:
    - species (optional): Specific species to analyze
    """
    try:
        if not disease_model:
            return jsonify({
                'success': False,
                'message': 'Disease prediction model not loaded'
            }), 503

        species = request.args.get('species')
        trends = disease_model.get_species_trends(species=species)

        return jsonify({
            'success': True,
            'trends': trends
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/disease/geographic', methods=['GET'])
def get_geographic_distribution():
    """Get disease distribution by region"""
    try:
        if not disease_model:
            return jsonify({
                'success': False,
                'message': 'Disease prediction model not loaded'
            }), 503

        distribution = disease_model.get_geographic_distribution()

        return jsonify({
            'success': True,
            'distribution': distribution
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/disease/train', methods=['POST'])
def train_disease_model():
    """Train or retrain the disease prediction model"""
    try:
        from scripts.disease_prediction import DiseasePredictionModel

        global disease_model

        print("\n🚀 Starting disease prediction model training...")
        disease_model = DiseasePredictionModel()
        results = disease_model.train()

        print("✓ Training complete!")

        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'results': results
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# SALES FORECASTING ENDPOINTS (Phase 3)
# ===========================================================================

@app.route('/api/ml/sales/train', methods=['POST'])
def train_sales_model():
    """Train or retrain the sales forecasting model"""
    try:
        from scripts.sales_forecasting import SalesForecastingModel

        global sales_model

        print("\n🚀 Starting sales forecasting model training...")
        sales_model = SalesForecastingModel()
        results = sales_model.train()

        print("✓ Sales model training complete!")

        return jsonify({
            'success': True,
            'message': 'Sales forecasting model trained successfully',
            'results': results
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/sales/forecast', methods=['GET'])
def forecast_sales():
    """
    Forecast revenue for the next N days

    Query params:
    - periods (optional): Number of days to forecast (default: 90, max: 365)
    """
    try:
        if not sales_model:
            return jsonify({
                'success': False,
                'message': 'Sales forecasting model not loaded'
            }), 503

        periods = request.args.get('periods', 90, type=int)
        periods = max(7, min(365, periods))

        result = sales_model.forecast_revenue(periods=periods)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'forecast': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/sales/predict-month', methods=['POST'])
def predict_monthly_revenue():
    """
    Predict revenue for a specific month and year

    Request body:
    {
        "month": 6,
        "year": 2025
    }
    """
    try:
        if not sales_model:
            return jsonify({
                'success': False,
                'message': 'Sales forecasting model not loaded'
            }), 503

        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        month = int(data.get('month', 1))
        year = int(data.get('year', 2025))

        if not (1 <= month <= 12):
            return jsonify({
                'success': False,
                'error': 'month must be between 1 and 12'
            }), 400

        result = sales_model.predict_monthly_revenue(month=month, year=year)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'prediction': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/sales/trends', methods=['GET'])
def get_sales_trends():
    """
    Get historical sales trends and seasonal patterns

    Query params:
    - months (optional): Number of months to analyse (default: 12, max: 60)
    """
    try:
        if not sales_model:
            return jsonify({
                'success': False,
                'message': 'Sales forecasting model not loaded'
            }), 503

        months = request.args.get('months', 12, type=int)
        months = max(1, min(60, months))

        result = sales_model.get_sales_trends(months=months)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'trends': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/sales/top-services', methods=['GET'])
def get_top_revenue_services():
    """
    Get top revenue-generating services and products

    Query params:
    - limit (optional): Number of items to return (default: 10)
    """
    try:
        if not sales_model:
            return jsonify({
                'success': False,
                'message': 'Sales forecasting model not loaded'
            }), 503

        limit = request.args.get('limit', 10, type=int)
        result = sales_model.get_top_revenue_services(limit=limit)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'top_services': result.get('top_services', [])
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# INVENTORY FORECASTING ENDPOINTS (Phase 3)
# ===========================================================================

@app.route('/api/ml/inventory/train', methods=['POST'])
def train_inventory_model():
    """Train or retrain the inventory forecasting model"""
    try:
        from scripts.inventory_forecasting import InventoryForecastingModel

        global inventory_model

        print("\n🚀 Starting inventory forecasting model training...")
        inventory_model = InventoryForecastingModel()
        results = inventory_model.train()

        print("✓ Inventory model training complete!")

        return jsonify({
            'success': True,
            'message': 'Inventory forecasting model trained successfully',
            'results': results
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/inventory/forecast', methods=['POST'])
def forecast_inventory():
    """
    Predict demand for a specific inventory item

    Request body:
    {
        "item_id": 5,
        "days": 30
    }
    """
    try:
        if not inventory_model:
            return jsonify({
                'success': False,
                'message': 'Inventory forecasting model not loaded'
            }), 503

        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        item_id = data.get('item_id')
        if not item_id:
            return jsonify({
                'success': False,
                'error': 'item_id is required'
            }), 400

        days = int(data.get('days', 30))
        result = inventory_model.predict_item_demand(item_id=item_id, days=days)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'forecast': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/inventory/reorder-suggestions', methods=['GET'])
def get_reorder_suggestions():
    """Get intelligent reorder suggestions for all inventory items"""
    try:
        if not inventory_model:
            return jsonify({
                'success': False,
                'message': 'Inventory forecasting model not loaded'
            }), 503

        result = inventory_model.get_reorder_recommendations()

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'recommendations': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/inventory/fast-moving', methods=['GET'])
def get_fast_moving_items():
    """
    Get fast-moving and slow-moving inventory items

    Query params:
    - limit (optional): Number of items per category to return (default: 10)
    """
    try:
        if not inventory_model:
            return jsonify({
                'success': False,
                'message': 'Inventory forecasting model not loaded'
            }), 503

        limit = request.args.get('limit', 10, type=int)
        result = inventory_model.get_fast_moving_items(limit=limit)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'fast_moving': result.get('fast_moving_items', []),
            'slow_moving': result.get('slow_moving_items', []),
            'total_active_items': result.get('total_active_items', 0)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/inventory/category-analysis', methods=['GET'])
def get_category_demand_analysis():
    """Get demand analysis broken down by inventory category"""
    try:
        if not inventory_model:
            return jsonify({
                'success': False,
                'message': 'Inventory forecasting model not loaded'
            }), 503

        result = inventory_model.get_category_demand_analysis()

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'category_analysis': result.get('category_analysis', [])
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/inventory/predict-restock', methods=['POST'])
def predict_restock_date():
    """
    Predict when a specific item will need restocking

    Request body:
    {
        "item_id": 5
    }
    """
    try:
        if not inventory_model:
            return jsonify({
                'success': False,
                'message': 'Inventory forecasting model not loaded'
            }), 503

        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        item_id = data.get('item_id')
        if not item_id:
            return jsonify({
                'success': False,
                'error': 'item_id is required'
            }), 400

        result = inventory_model.predict_restock_date(item_id=item_id)

        if 'error' in result:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500

        return jsonify({
            'success': True,
            'restock_prediction': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# DATA LOADING AND TESTING ENDPOINTS (unchanged)
# ===========================================================================

@app.route('/api/ml/data/sales', methods=['GET'])
def load_sales_data():
    """Load sales data for testing"""
    try:
        from utils.data_loader import DataLoader

        loader = DataLoader()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        df = loader.load_sales_data(start_date, end_date)

        return jsonify({
            'success': True,
            'data': df.to_dict('records'),
            'count': len(df)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/data/inventory', methods=['GET'])
def load_inventory_data():
    """Load inventory data for testing"""
    try:
        from utils.data_loader import DataLoader

        loader = DataLoader()
        df = loader.load_inventory_data()

        return jsonify({
            'success': True,
            'data': df.to_dict('records'),
            'count': len(df)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/test/db-connection', methods=['GET'])
def test_db_connection():
    """Test database connection"""
    try:
        from config.db_connection import get_db_connection

        db = get_db_connection()
        with db as connection:
            result = connection.execute_query("SELECT NOW() as current_time")

        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'timestamp': result[0]['current_time'].isoformat() if result else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# ERROR HANDLERS (unchanged)
# ===========================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    port = app.config['PORT']
    print(f"Starting ML Service on port {port}...")
    print(f"Health check: http://localhost:{port}/api/ml/health")
    app.run(host='0.0.0.0', port=port, debug=app.config['DEBUG'])
