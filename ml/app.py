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


# Load models at startup
print("\n" + "=" * 60)
print("  VetCare Pro ML Service - Starting Up")
print("=" * 60)
load_disease_model()
print("=" * 60 + "\n")


@app.route('/api/ml/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'VetCare Pro ML Service',
        'version': '1.0.0'
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
            'sales_forecasting': {'loaded': False, 'trained': False},
            'inventory_forecasting': {'loaded': False, 'trained': False}
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


# Disease Prediction Endpoints
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


# Sales Forecasting Endpoints (to be implemented in Phase 3)
@app.route('/api/ml/sales/forecast', methods=['POST'])
def forecast_sales():
    """Forecast sales"""
    try:
        data = request.get_json()
        forecast_period = data.get('period', 30)  # days
        
        return jsonify({
            'success': False,
            'message': 'Sales forecasting model not yet implemented'
        }), 501
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/sales/trends', methods=['GET'])
def get_sales_trends():
    """Get sales trends"""
    return jsonify({
        'success': False,
        'message': 'Sales trends analysis not yet implemented'
    }), 501


# Inventory Forecasting Endpoints (to be implemented in Phase 3)
@app.route('/api/ml/inventory/forecast', methods=['POST'])
def forecast_inventory():
    """Forecast inventory demand"""
    try:
        data = request.get_json()
        item_id = data.get('item_id')
        forecast_days = data.get('days', 30)
        
        return jsonify({
            'success': False,
            'message': 'Inventory forecasting model not yet implemented'
        }), 501
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/ml/inventory/reorder-suggestions', methods=['GET'])
def get_reorder_suggestions():
    """Get intelligent reorder suggestions"""
    return jsonify({
        'success': False,
        'message': 'Reorder suggestions not yet implemented'
    }), 501


# Data Loading and Testing Endpoints
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


# Error handlers
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
