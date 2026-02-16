"""
Flask API Server for ML Services
Provides REST API endpoints for machine learning predictions
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'True') == 'True'
app.config['PORT'] = int(os.getenv('FLASK_PORT', 5001))


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
        # This will be implemented when individual models are created
        models_status = {
            'disease_prediction': {'loaded': False, 'trained': False},
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


# Disease Prediction Endpoints (to be implemented in Phase 2)
@app.route('/api/ml/disease/predict', methods=['POST'])
def predict_disease():
    """Predict disease outbreak"""
    return jsonify({
        'success': False,
        'message': 'Disease prediction model not yet implemented'
    }), 501


@app.route('/api/ml/disease/trends', methods=['GET'])
def get_disease_trends():
    """Get disease trends"""
    return jsonify({
        'success': False,
        'message': 'Disease trends analysis not yet implemented'
    }), 501


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
