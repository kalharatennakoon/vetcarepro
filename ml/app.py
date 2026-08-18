"""
Flask API Server for ML Services
Provides REST API endpoints for machine learning predictions
"""

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import os
import glob
import re
import json
import time
import itertools
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

# DB connection for retraining check
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from config.db_connection import get_raw_db_connection as get_db_connection

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# The browser never talks to this service directly - only the Node backend
# does (see server/src/services/mlService.js / aiService.js) - so CORS only
# needs to admit the Node origin, not every origin.
CORS(app, origins=[os.getenv('CLIENT_URL', 'http://localhost:5173')])

# Shared-secret check on the Node -> Flask hop. This service trusts `role`/
# `customer_id`/`user_id` straight from the request body (see
# /api/ml/rag/chat's docstring) on the assumption they were already derived
# from an authenticated caller by server/src/middleware/auth.js - that
# assumption only holds if this port is unreachable by anything except the
# Node backend. The 127.0.0.1 bind below is the primary control; this header
# check is defense in depth in case that bind is ever loosened back to
# 0.0.0.0 (e.g. for a containerized deployment).
ML_INTERNAL_TOKEN = os.getenv('ML_INTERNAL_TOKEN')


@app.before_request
def _check_internal_token():
    if request.path == '/api/ml/health' or request.method == 'OPTIONS':
        return None
    if not ML_INTERNAL_TOKEN:
        return None
    if request.headers.get('X-Internal-Token') != ML_INTERNAL_TOKEN:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    return None

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

            # Support both save formats: flat dict and base-class-wrapped {'model': {...}}
            model_components = loaded_data.get('model', loaded_data)
            if not isinstance(model_components, dict):
                model_components = loaded_data

            # Restore model components
            sales_model.prophet_model = model_components.get('prophet_model')
            sales_model.demand_model = model_components.get('demand_model')
            sales_model.scaler = model_components.get('scaler')
            sales_model.feature_columns = model_components.get('feature_columns', [])
            sales_model.training_data = model_components.get('training_data', {})

            import pandas as pd
            monthly_records = model_components.get('monthly_summary', [])
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

            # Support both save formats: flat dict and base-class-wrapped {'model': {...}}
            model_components = loaded_data.get('model', loaded_data)
            if not isinstance(model_components, dict):
                model_components = loaded_data

            # Restore model components
            inventory_model.demand_model = model_components.get('demand_model')
            inventory_model.scaler = model_components.get('scaler')
            inventory_model.feature_columns = model_components.get('feature_columns', [])
            inventory_model.item_stats = model_components.get('item_stats', {})
            inventory_model.category_map = model_components.get('category_map', {})

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


# ===========================================================================
# TRAINING - shared by the manual "Retrain" buttons (POST /api/ml/*/train)
# and the daily 9AM scheduled retrain below, so both paths train the exact
# same way and update the same module-level globals in place.
# ===========================================================================

def _run_disease_training():
    from scripts.disease_prediction import DiseasePredictionModel
    global disease_model
    disease_model = DiseasePredictionModel()
    return disease_model.train()


def _run_sales_training():
    from scripts.sales_forecasting import SalesForecastingModel
    global sales_model
    sales_model = SalesForecastingModel()
    return sales_model.train()


def _run_inventory_training():
    from scripts.inventory_forecasting import InventoryForecastingModel
    global inventory_model
    inventory_model = InventoryForecastingModel()
    return inventory_model.train()


def _scheduled_retrain_all_models():
    """
    Runs daily at 09:00 Asia/Colombo (see scheduler setup below). Retrains
    all 3 models back-to-back, independently - one model failing to train
    (e.g. not enough new data) shouldn't stop the other two from retraining.
    This calls the training classes directly rather than hitting the
    /api/ml/*/train HTTP routes, so it isn't subject to the 30s timeout
    server/src/services/mlService.js applies to the manual-button path.
    """
    print(f"\n[Scheduled Retrain] Starting daily model retrain ({datetime.now().isoformat()})")
    for label, train_fn in (
        ('disease prediction', _run_disease_training),
        ('sales forecasting', _run_sales_training),
        ('inventory forecasting', _run_inventory_training),
    ):
        started = time.time()
        try:
            train_fn()
            print(f"[Scheduled Retrain] {label} model retrained OK in {time.time() - started:.1f}s")
        except Exception as e:
            print(f"[Scheduled Retrain] {label} model retrain FAILED after {time.time() - started:.1f}s: {e}")
    print(f"[Scheduled Retrain] Daily retrain finished ({datetime.now().isoformat()})\n")


def _scheduled_rag_ingest_all():
    """
    Runs 3x/day at 09:00, 13:00, and 17:00 Asia/Colombo (see scheduler setup
    below) - replaces the admin "Refresh knowledge base" button, which has
    been removed from the UI in favor of this automatic schedule. Calls
    ingest_all() directly (same function the removed button's
    /api/ml/rag/ingest/all route called) rather than going through Flask/
    Node, so it isn't subject to any HTTP timeout.

    ingest_all() re-embeds every row from every source table on each call
    (there's no "only what changed since last run" filter - see
    scripts/rag/ingest.py), so this is real, non-trivial work: one Ollama
    embedding call per row. Logged the same way as the retrain job so a slow
    or failing run is visible in the server log.
    """
    from scripts.rag.ingest import ingest_all

    print(f"\n[Scheduled Ingest] Starting knowledge base refresh ({datetime.now().isoformat()})")
    started = time.time()
    try:
        results = ingest_all()
        print(f"[Scheduled Ingest] Done in {time.time() - started:.1f}s: {results}")
    except Exception as e:
        print(f"[Scheduled Ingest] FAILED after {time.time() - started:.1f}s: {e}")


# Load models at startup
print("\n" + "=" * 60)
print("  VetCare Pro ML Service - Starting Up")
print("=" * 60)
load_disease_model()
load_sales_model()
load_inventory_model()
print("=" * 60 + "\n")

# Flask's debug reloader (active whenever FLASK_DEBUG=True, the default -
# see .env.example) re-executes this whole module in a child process and
# only sets WERKZEUG_RUN_MAIN there, keeping the original watcher process
# unmarked. Registering the scheduler unconditionally would start it in
# both processes - only the child actually serves requests, so gate on that
# marker; outside debug mode there's no reloader/second process at all, so
# app.config['DEBUG'] being False is enough on its own.
if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not app.config['DEBUG']:
    _scheduler = BackgroundScheduler(timezone='Asia/Colombo')
    _scheduler.add_job(
        _scheduled_retrain_all_models, 'cron', hour=9, minute=0,
        id='daily_model_retrain', replace_existing=True
    )
    # Offset the 9AM slot 30 minutes past the model retrain (9:30 instead of
    # 9:00 sharp) so the two scheduled jobs don't compete for CPU/DB/Ollama
    # at the same moment - ingest_all() re-embeds every row on every run
    # (see _scheduled_rag_ingest_all's docstring), and the retrain job is
    # doing its own DB-heavy Prophet/RandomForest fits right at 9:00.
    # Three separate jobs, not one cron trigger with hour='9,13,17' - cron
    # fields are independent, not paired positionally, so a single trigger
    # with hour='9,13,17', minute='30,0,0' would fire at the cross product
    # of both fields (6 times/day: 9:00, 9:30, 13:00, 13:30, 17:00, 17:30),
    # not the 3 intended times.
    _scheduler.add_job(
        _scheduled_rag_ingest_all, 'cron', hour=9, minute=30,
        id='rag_ingest_all_morning', replace_existing=True
    )
    _scheduler.add_job(
        _scheduled_rag_ingest_all, 'cron', hour=13, minute=0,
        id='rag_ingest_all_afternoon', replace_existing=True
    )
    _scheduler.add_job(
        _scheduled_rag_ingest_all, 'cron', hour=17, minute=0,
        id='rag_ingest_all_evening', replace_existing=True
    )
    _scheduler.start()
    print("[Scheduler] Daily model retrain scheduled for 09:00 Asia/Colombo")
    print("[Scheduler] Knowledge base refresh scheduled for 09:30, 13:00, 17:00 Asia/Colombo\n")


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
        from datetime import datetime

        def latest_model_date(prefix):
            """Return ISO timestamp from the latest model file's modification time, or None."""
            app_dir = os.path.dirname(os.path.abspath(__file__))
            files = glob.glob(os.path.join(app_dir, 'models', f'{prefix}_*.pkl'))
            if not files:
                return None
            latest_file = max(files)
            mtime = os.path.getmtime(latest_file)
            return datetime.fromtimestamp(mtime).isoformat()

        models_status = {
            'disease_prediction': {
                'loaded': disease_model is not None and disease_model.model is not None,
                'trained': disease_model is not None and disease_model.classification_model is not None,
                'data_size': disease_model.data_size if disease_model else 0,
                'training_date': disease_model.training_date.isoformat() if disease_model and disease_model.training_date else None,
                'last_trained_at': (
                    disease_model.training_date.isoformat()
                    if disease_model and disease_model.training_date
                    else latest_model_date('disease_prediction')
                ),
                'confidence': disease_model.get_model_confidence() if disease_model else None
            },
            'sales_forecasting': {
                'loaded': sales_model is not None,
                'trained': sales_model is not None and (
                    sales_model.prophet_model is not None or sales_model.demand_model is not None
                ),
                'training_data': sales_model.training_data if sales_model else {},
                'last_trained_at': latest_model_date('sales_forecasting')
            },
            'inventory_forecasting': {
                'loaded': inventory_model is not None,
                'trained': inventory_model is not None and inventory_model.demand_model is not None,
                'items_tracked': len(inventory_model.item_stats) if inventory_model else 0,
                'last_trained_at': latest_model_date('inventory_forecasting')
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
# RETRAINING CHECK ENDPOINT
# ===========================================================================

@app.route('/api/ml/retrain-check', methods=['GET'])
def retrain_check():
    """
    Compare current record counts against records_at_last_train in model_metadata.
    Returns a recommendation for each model if records have grown by >10% or >50 rows.
    """
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'DB connection failed'}), 500

        cur = conn.cursor()

        # Fetch stored metadata
        cur.execute("SELECT model_name, last_trained_at, records_at_last_train, model_version FROM model_metadata")
        rows = cur.fetchall()
        metadata = {r[0]: {'last_trained_at': r[1], 'records_at_last_train': r[2] or 0, 'model_version': r[3]} for r in rows}

        # Current record counts
        cur.execute("SELECT COUNT(*) FROM disease_cases")
        disease_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM billing WHERE payment_status IN ('fully_paid', 'partially_paid')")
        billing_count = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM inventory_transactions WHERE transaction_type = 'dispensed'")
        tx_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM billing_items WHERE item_id IS NOT NULL")
        billing_items_count = cur.fetchone()[0]
        inventory_count = tx_count if tx_count > 0 else billing_items_count

        cur.close()
        conn.close()

        def should_retrain(current, stored):
            if stored == 0:
                return current > 0, current
            growth = (current - stored) / stored
            return (growth >= 0.10 or (current - stored) >= 50), current - stored

        checks = {
            'disease_prediction': (disease_count, metadata.get('disease_prediction', {})),
            'sales_forecasting':  (billing_count,  metadata.get('sales_forecasting', {})),
            'inventory_forecasting': (inventory_count, metadata.get('inventory_forecasting', {})),
        }

        recommendations = {}
        for model_name, (current, meta) in checks.items():
            stored = meta.get('records_at_last_train', 0)
            needs_retrain, delta = should_retrain(current, stored)
            recommendations[model_name] = {
                'current_records': current,
                'records_at_last_train': stored,
                'new_records_since_train': delta,
                'last_trained_at': meta.get('last_trained_at').isoformat() if meta.get('last_trained_at') else None,
                'model_version': meta.get('model_version', 1),
                'retrain_recommended': needs_retrain,
                'reason': (
                    f"{delta} new records (+{round((delta/stored)*100)}%) since last training"
                    if stored > 0 and delta > 0
                    else ('Never trained' if stored == 0 else 'Up to date')
                )
            }

        any_recommended = any(r['retrain_recommended'] for r in recommendations.values())

        return jsonify({
            'success': True,
            'retrain_recommended': any_recommended,
            'models': recommendations
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


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
        days_lookback = max(1, min(365, int(data.get('days_lookback', 30))))

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


# Global predictor instance
pet_predictor = None


def get_pet_predictor():
    global pet_predictor
    if pet_predictor is None:
        from scripts.pet_health_predictor import PetHealthPredictor
        pet_predictor = PetHealthPredictor()
    return pet_predictor


@app.route('/api/ml/disease/pet-risk', methods=['POST'])
def predict_pet_risk():
    """Predict individual pet disease risk over time horizons."""
    try:
        data = request.get_json() or {}
        species = data.get('species')
        if not species:
            return jsonify({'success': False, 'message': 'species is required'}), 400
        result = get_pet_predictor().predict_individual_risk(
            species=species,
            breed=data.get('breed'),
            age_months=data.get('age_months'),
            past_diseases=data.get('past_diseases', []),
            time_horizons=data.get('time_horizons', [1, 6, 12, 24])
        )
        return jsonify({'success': True, 'prediction': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/disease/cancer-risk', methods=['POST'])
def predict_cancer_risk():
    """Estimate cancer/tumor risk based on breed and age."""
    try:
        data = request.get_json() or {}
        species = data.get('species')
        if not species:
            return jsonify({'success': False, 'message': 'species is required'}), 400
        result = get_pet_predictor().predict_cancer_risk(
            species=species,
            breed=data.get('breed'),
            age_months=data.get('age_months'),
            sex=data.get('sex')
        )
        return jsonify({'success': True, 'assessment': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/disease/outbreak-trend', methods=['GET'])
def get_outbreak_trend():
    """Project disease outbreak trend forward."""
    try:
        species = request.args.get('species') or None
        days_ahead = int(request.args.get('days_ahead', 90))
        result = get_pet_predictor().predict_outbreak_trend(
            days_ahead=days_ahead, species=species
        )
        return jsonify({'success': True, 'trend': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/disease/pandemic-risk', methods=['GET'])
def get_pandemic_risk():
    """Assess pandemic/epidemic potential."""
    try:
        species = request.args.get('species') or None
        result = get_pet_predictor().assess_pandemic_risk(species_filter=species)
        return jsonify({'success': True, 'assessment': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/disease/train', methods=['POST'])
def train_disease_model():
    """Train or retrain the disease prediction model (admin-triggered, via the Retrain button)"""
    try:
        print("\n🚀 Starting disease prediction model training...")
        results = _run_disease_training()
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


@app.route('/api/ml/disease/forecast', methods=['GET'])
def forecast_disease_trends():
    """Forecast future disease trends using Prophet time-series model"""
    try:
        if not disease_model:
            return jsonify({'success': False, 'error': 'Disease model not loaded'}), 503

        periods_months = request.args.get('periods', 12, type=int)
        periods_months = max(1, min(60, periods_months))
        species = request.args.get('species', None)
        disease_category = request.args.get('disease_category', None)

        result = disease_model.forecast_disease_trends(
            periods_months=periods_months,
            species=species if species else None,
            disease_category=disease_category if disease_category else None
        )

        if 'error' in result:
            return jsonify({'success': False, 'error': result['error']}), 400

        return jsonify({'success': True, 'forecast': result}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===========================================================================
# SALES FORECASTING ENDPOINTS (Phase 3)
# ===========================================================================

@app.route('/api/ml/sales/train', methods=['POST'])
def train_sales_model():
    """Train or retrain the sales forecasting model (admin-triggered, via the Retrain button)"""
    try:
        print("\n🚀 Starting sales forecasting model training...")
        results = _run_sales_training()
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
    """Train or retrain the inventory forecasting model (admin-triggered, via the Retrain button)"""
    try:
        print("\n🚀 Starting inventory forecasting model training...")
        results = _run_inventory_training()
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

        days = max(7, min(365, int(data.get('days', 30))))
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

        days = request.args.get('days', 30, type=int)
        days = max(7, min(365, days))
        result = inventory_model.get_reorder_recommendations(days=days)

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
        from config.db_connection import get_raw_db_connection

        conn = get_raw_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT NOW() as current_time")
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Database connection successful',
            'timestamp': row[0].isoformat() if row else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


# ===========================================================================
# AI DAILY BRIEFING ROUTE
#
# Summarizes an already-aggregated numeric payload (built server-side by
# server/src/services/briefingService.js from existing /api/ml/* endpoints)
# into a short natural-language briefing. Calls ollama_client.py directly -
# deliberately NOT part of the RAG chain in scripts/rag/rag_service.py,
# since there is no retrieval step here, just summarization of numbers the
# caller already has.
# ===========================================================================

_BRIEFING_ROLE_FOCUS = {
    'admin': (
        'You are summarizing today\'s clinic-wide business signals for a clinic administrator: '
        'revenue forecast trend, top revenue services, inventory reorder alerts, and disease '
        'outbreak/pandemic risk.'
    ),
    'veterinarian': (
        'You are summarizing today\'s clinical signals for a veterinarian: today\'s scheduled '
        'appointments cross-referenced with any elevated pet disease-recurrence or cancer risk, '
        'plus a note on disease trends. Do not mention pandemic risk - that is not part of this data.'
    ),
    'receptionist': (
        'You are summarizing today\'s front-desk operational signals for a receptionist: '
        'inventory reorder suggestions, today\'s appointment load, and outstanding billing '
        'balances. Do not mention or infer any clinical/medical/disease information - none was '
        'provided and none should appear in your answer.'
    ),
}

_BRIEFING_SYSTEM_PROMPT_TEMPLATE = """{role_focus}

Respond with ONLY a JSON object, no other text, in exactly this shape:
{{"summary": "<one sentence overview>", "bullets": ["<insight 1>", "<insight 2>", "<insight 3 optional>", "<insight 4 optional>"]}}

Rules:
- Use only the data given to you below. Do not invent numbers.
- 2 to 4 bullets, each one short sentence.
- Use metric units and Sri Lankan Rupees (Rs.) for any currency figures - never dollars.
- If the data has nothing noteworthy, say so briefly rather than padding with filler.
"""


def _extract_json_object(text):
    """Best-effort extraction of a {...} JSON object from LLM output that may
    include stray text around it despite the prompt asking for JSON only."""
    import json as _json
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return _json.loads(text[start:end + 1])
    except (ValueError, TypeError):
        return None


@app.route('/api/ml/briefing/summarize', methods=['POST'])
def briefing_summarize():
    """
    Body: { "role": "admin" | "veterinarian" | "receptionist", "data": {...} }
    "data" is the already-aggregated numeric payload; this endpoint only summarizes it.
    """
    try:
        from scripts.rag.ollama_client import generate_answer, normalize_currency, OllamaError

        body = request.get_json(silent=True) or {}
        role = body.get('role')
        data = body.get('data')

        if role not in _BRIEFING_ROLE_FOCUS:
            return jsonify({'success': False, 'message': 'role must be admin, veterinarian, or receptionist'}), 400
        if not isinstance(data, dict) or not data:
            return jsonify({'success': False, 'message': 'data is required'}), 400

        import json as _json
        system_prompt = _BRIEFING_SYSTEM_PROMPT_TEMPLATE.format(role_focus=_BRIEFING_ROLE_FOCUS[role])
        user_prompt = f'Today\'s data:\n{_json.dumps(data, default=str)}'

        try:
            raw, _ = generate_answer(system_prompt, user_prompt)
        except OllamaError as e:
            return jsonify({'success': False, 'message': str(e)}), 503

        parsed = _extract_json_object(raw)
        if not parsed or 'summary' not in parsed:
            # Model didn't follow the JSON format - fall back to raw text as the summary
            # rather than failing the whole briefing.
            parsed = {'summary': raw.strip(), 'bullets': []}

        bullets = parsed.get('bullets') or []
        if not isinstance(bullets, list):
            bullets = []

        briefing = {
            'summary': normalize_currency(str(parsed.get('summary', ''))),
            'bullets': [normalize_currency(str(b)) for b in bullets][:4],
        }

        return jsonify({'success': True, 'briefing': briefing}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ===========================================================================
# RAG / AI ASSISTANT ROUTES
# ===========================================================================

@app.route('/api/ml/rag/health', methods=['GET'])
def rag_health():
    """Check Ollama connectivity and required models"""
    try:
        from scripts.rag.ollama_client import check_health
        return jsonify(check_health()), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/medical-records', methods=['POST'])
def rag_ingest_medical_records():
    """
    (Re)ingest medical records into the vector store.
    Body (optional): { "record_id": 123 }  -> ingest just one record
    No body / empty body -> backfill all medical records
    """
    try:
        from scripts.rag.ingest import ingest_medical_records
        data = request.get_json(silent=True) or {}
        record_id = data.get('record_id')
        result = ingest_medical_records(record_id=record_id)
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/disease-cases', methods=['POST'])
def rag_ingest_disease_cases():
    """
    (Re)ingest disease cases into the vector store.
    Body (optional): { "case_id": 123 }  -> ingest just one case
    No body / empty body -> backfill all disease cases
    """
    try:
        from scripts.rag.ingest import ingest_disease_cases
        data = request.get_json(silent=True) or {}
        case_id = data.get('case_id')
        result = ingest_disease_cases(case_id=case_id)
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/lab-reports', methods=['POST'])
def rag_ingest_lab_reports():
    """
    (Re)ingest lab report metadata into the vector store.
    Body (optional): { "report_id": 123 }  -> ingest just one report
    No body / empty body -> backfill all lab reports
    """
    try:
        from scripts.rag.ingest import ingest_lab_reports
        data = request.get_json(silent=True) or {}
        report_id = data.get('report_id')
        result = ingest_lab_reports(report_id=report_id)
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/vaccinations', methods=['POST'])
def rag_ingest_vaccinations():
    """
    (Re)ingest vaccination records into the vector store.
    Body (optional): { "vaccination_id": 123 }  -> ingest just one record
    No body / empty body -> backfill all vaccinations
    """
    try:
        from scripts.rag.ingest import ingest_vaccinations
        data = request.get_json(silent=True) or {}
        vaccination_id = data.get('vaccination_id')
        result = ingest_vaccinations(vaccination_id=vaccination_id)
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/faqs', methods=['POST'])
def rag_ingest_faqs():
    """(Re)ingest the static FAQ / care-instruction content."""
    try:
        from scripts.rag.ingest import ingest_faqs
        result = ingest_faqs()
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/staff-faqs', methods=['POST'])
def rag_ingest_staff_faqs():
    """(Re)ingest the static staff/internal FAQ content (source_type='staff_faq')."""
    try:
        from scripts.rag.ingest import ingest_staff_faqs
        result = ingest_staff_faqs()
        return jsonify({'success': True, **result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/all', methods=['POST'])
def rag_ingest_all():
    """Backfill every source type in one call (medical records, disease cases, lab reports, FAQs, staff FAQs)."""
    try:
        from scripts.rag.ingest import ingest_all
        results = ingest_all()
        return jsonify({'success': True, 'results': results}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/ingest/pet', methods=['POST'])
def rag_ingest_pet():
    """
    Re-ingest every chunk belonging to a single pet (medical records, disease
    cases, lab reports, vaccinations). Call after a pet's name/species/breed
    changes, since chunk text embeds those fields at ingestion time.
    Body: { "pet_id": "PET-0001" }
    """
    try:
        from scripts.rag.ingest import reingest_pet
        data = request.get_json(force=True)
        pet_id = data.get('pet_id')
        if not pet_id:
            return jsonify({'success': False, 'error': 'pet_id is required'}), 400
        result = reingest_pet(pet_id)
        return jsonify({'success': True, 'results': result}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/chunks/delete', methods=['POST'])
def rag_delete_chunk():
    """
    Remove a single rag_chunks row so the assistant stops citing deleted data.
    Call this from a record's delete handler.
    Body: { "source_type": "medical_record", "source_id": "123" }
    """
    try:
        from scripts.rag.ingest import delete_chunk
        data = request.get_json(force=True)
        source_type = data.get('source_type')
        source_id = data.get('source_id')
        if not source_type or source_id is None:
            return jsonify({'success': False, 'error': 'source_type and source_id are required'}), 400
        deleted = delete_chunk(source_type, source_id)
        return jsonify({'success': True, 'deleted': deleted}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/photo-guidance/process', methods=['POST'])
def rag_photo_guidance_process():
    """
    Accept a pet-owner photo guidance job and process it in the background.
    Returns immediately (well under a second) - the actual vision-model
    generation takes ~3 minutes (see scripts.rag.photo_guidance), so this
    route must not block on it. The Node backend has already inserted a
    'pending' row and responded to its own caller before this is called;
    this route's only job is to hand the row off to a background thread that
    will update it to 'processing' then 'completed'/'failed' directly in
    Postgres.
    Body: { "job_id": 1, "photo_path": "pet-ai-photos/xyz.jpg",
            "owner_note": "...", "pet_id": "PET-0001", "customer_id": "CUST-0001" }
    """
    try:
        from scripts.rag.photo_guidance import submit_job
        data = request.get_json(force=True)
        job_id = data.get('job_id')
        photo_path = data.get('photo_path')
        pet_id = data.get('pet_id')
        customer_id = data.get('customer_id')
        if not job_id or not photo_path or not pet_id or not customer_id:
            return jsonify({'success': False, 'error': 'job_id, photo_path, pet_id, and customer_id are required'}), 400
        submit_job(job_id, photo_path, data.get('owner_note'), pet_id, customer_id)
        return jsonify({'success': True, 'accepted': True}), 202
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/explain', methods=['POST'])
def rag_explain():
    """
    Explain a raw ML model output in plain language.
    Body: { "output_type": "outbreak_risk" | "sales_forecast" | "inventory_forecast" | ...,
            "data": { ... raw model output ... } }
    """
    try:
        from scripts.rag.rag_service import explain_ml_output
        payload = request.get_json(force=True)
        output_type = payload.get('output_type', 'unknown')
        data = payload.get('data')

        if not data:
            return jsonify({'success': False, 'error': 'data is required'}), 400

        explanation, _ = explain_ml_output(output_type, data)
        return jsonify({'success': True, 'explanation': explanation}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Chat questions spell small counts out ("the next three years") about as
# often as they use digits ("the next 3 years") - matching digits only
# silently mis-parses the spelled-out form as "no time horizon given" and
# falls back to a default window instead of the one actually requested.
_NUMBER_WORDS = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6,
    'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12,
    'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
    'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
}
_NUMBER_PATTERN = r'(?:\d+|' + '|'.join(_NUMBER_WORDS.keys()) + r')'


def _parse_count(text):
    return int(text) if text.isdigit() else _NUMBER_WORDS[text.lower()]


def _extract_time_horizon(question, unit='days', default=30, minimum=7, maximum=365):
    """
    Picks a "next N days/weeks/months/years" time horizon out of a chat
    question for the live-model chat intents below, converts it to the
    caller's target unit (days for sales/inventory, months for the disease
    trend forecast - each model takes a different unit), and clamps to
    [minimum, maximum] to match that model's own route-level clamp (e.g.
    "for the next 18 months" -> ~547 days -> clamped to 365 for inventory,
    matching /api/ml/inventory/forecast's own clamp; "next 5 years" -> 60
    months -> matches /api/ml/disease/forecast's clamp of 1-60). N may be a
    digit or a spelled-out number up to twenty (see _NUMBER_WORDS).
    Returns (value, was_clamped) so the caller can note in the answer when
    the requested period got capped rather than silently answering a
    different window than what was asked for.
    """
    match = re.search(
        rf'\bnext\s+({_NUMBER_PATTERN})\s*(day|week|month|year)s?\b', question, re.IGNORECASE
    )
    if not match:
        return default, False
    count = _parse_count(match.group(1))
    src_unit = match.group(2).lower()
    per_unit = (
        {'day': 1 / 30, 'week': 7 / 30, 'month': 1, 'year': 12} if unit == 'months'
        else {'day': 1, 'week': 7, 'month': 30, 'year': 365}
    )
    requested = max(round(count * per_unit[src_unit]), 1)
    clamped = max(minimum, min(requested, maximum))
    return clamped, clamped != requested


# Same message as structured_query.py's _clinical_detail_redirect() -
# duplicated here rather than imported, since the four live-model-gate
# role-denials below fully short-circuit the request before
# rag_service.answer_question (and structured_query.py's own redirect)
# ever runs. Keep this in sync with _clinical_detail_redirect() if that
# wording changes.
_CLINICAL_DETAIL_REDIRECT_NOTE = (
    "Medical record and diagnosis details aren't available through this "
    "assistant for your role - please check with a veterinarian or admin "
    "for clinical specifics."
)

# Broad "does this question also ask for clinical detail" check - not the
# narrower LIST_RECORDS_BY_PET intent match in structured_query.py (which
# requires specific list/show phrasing), just whether the words are present
# at all, since this is used to decide whether to APPEND a second denial,
# not to answer the clinical-detail request itself.
_MENTIONS_CLINICAL_DETAIL = re.compile(
    r'\bmedical\s+records?\b|\bmedical\s+history\b|\bdiagnos(?:is|es)\b|'
    r'\bdisease\s+cases?\b|\blab\s+reports?\b',
    re.IGNORECASE
)


def _with_clinical_detail_note(answer: str, question: str, role: str) -> str:
    """
    A bundled question like "can I see pet Max's medical history, and
    what's our revenue forecast?" has two independently-restricted halves
    for a receptionist - but the live-model gates below return as soon as
    ONE role-denial matches, so without this the medical-history half was
    silently dropped instead of also denied (see the answer-every-
    sub-question rule in rag_service.py's system prompts, which this
    mirrors for the one path that short-circuits before either prompt is
    ever read).
    """
    if role == 'receptionist' and _MENTIONS_CLINICAL_DETAIL.search(question):
        return f'{answer} {_CLINICAL_DETAIL_REDIRECT_NOTE}'
    return answer


def _outbreak_risk_chart(question: str):
    """Builds the `chart` payload (just the {type, title, data, series,
    multi_color} spec the client renders, not a full response dict)
    attached to the outbreak-risk live-model gate below when the question
    contains a chart trigger word - see that gate's comment for why this
    can't just be handled by try_chart_intent. Returns None when there are
    no cases in the window to chart (chart_recent_disease_cases' _no_data
    path) - the LLM's text explanation already covers that case on its own,
    so nothing needs attaching."""
    from scripts.rag.chart_intent import chart_recent_disease_cases, _requested_chart_type
    by = 'severity' if re.search(r'\bsever(?:ity|ities)\b', question, re.IGNORECASE) else 'category'
    result = chart_recent_disease_cases(days_lookback=30, by=by, chart_type=_requested_chart_type(question))
    return result.get('chart')


# Matches forecast_disease_trends' own historical_monthly_avg window
# (hist_avg = merged['disease_cases'].tail(6).mean()) - keeping the chart's
# "actual" months and the text answer's historical average describing the
# same period, rather than two different windows that could disagree.
_HISTORICAL_TREND_MONTHS = 6


def _historical_monthly_disease_counts(months_back: int = _HISTORICAL_TREND_MONTHS) -> list:
    """Real-SQL monthly disease-case counts for the months leading up to
    now - prepended onto the forecast chart below so the line shows where
    the trend is actually coming from, not just where it's projected to go
    (a forecast-only line doesn't visually read as "increasing"/"decreasing"
    on its own - that direction is a comparison against history, currently
    only stated in the text). Same generate_series zero-fill pattern as
    chart_intent.py's _chart_revenue_by_month, so a month with no cases is a
    real zero point, not an absent one."""
    from scripts.rag.chart_intent import _query
    rows = _query(
        """
        WITH months AS (
            SELECT generate_series(
                date_trunc('month', CURRENT_DATE) - make_interval(months => %s),
                date_trunc('month', CURRENT_DATE),
                interval '1 month'
            )::date AS month_start
        )
        SELECT m.month_start, COUNT(dc.case_id)
        FROM months m
        LEFT JOIN disease_cases dc
               ON date_trunc('month', dc.diagnosis_date)::date = m.month_start
        GROUP BY m.month_start
        ORDER BY m.month_start
        """,
        (months_back - 1,)
    )
    return [{'month': r[0].strftime('%Y-%m'), 'count': int(r[1])} for r in rows]


def _disease_trend_chart(question: str, predictions: list):
    """Builds the chart attached to the disease-trend-forecast live-model
    gate below when the question contains a chart trigger word - same
    reasoning as _outbreak_risk_chart (this gate also runs before
    try_chart_intent ever gets a look at the question). Unlike
    _outbreak_risk_chart, the forecast half of this data comes straight from
    the Prophet forecast itself (forecast_disease_trends' `predictions`),
    not a real-SQL aggregation - chart_intent.py's "every number here comes
    from real SQL, the model is not involved" invariant doesn't apply to a
    genuine forecast, so this stays here rather than living in
    chart_intent.py. The historical half (see
    _historical_monthly_disease_counts) IS real SQL, prepended so the trend
    is visible in the chart's shape, not just asserted in the text."""
    from scripts.rag.chart_intent import CHART_TYPE_PIE, PRIMARY_COLOR, SECONDARY_COLOR
    if not predictions:
        return None

    forecast_points = [
        {'label': datetime.strptime(p['month'], '%Y-%m').strftime('%b %Y'), 'forecast': p['predicted_cases']}
        for p in predictions
    ]

    if CHART_TYPE_PIE.search(question):
        # A pie has no notion of "leading up to" - explicitly asking for one
        # still gets just the forecast slices, same as before this change.
        return {
            'type': 'pie',
            'title': f'Forecasted Disease Cases - Next {len(predictions)} Months',
            'data': [{'label': p['label'], 'count': p['forecast']} for p in forecast_points],
            'series': [{'key': 'count', 'name': 'Predicted Cases', 'color': PRIMARY_COLOR}],
            'multi_color': False,
        }

    historical_points = [
        {'label': datetime.strptime(h['month'], '%Y-%m').strftime('%b %Y'), 'historical': h['count']}
        for h in _historical_monthly_disease_counts()
    ]
    # AiChartMessage.jsx's line renderer only draws a series where its
    # dataKey has a value, so without this the "Actual Cases" and
    # "Predicted Cases" lines would show a visible gap at the boundary
    # instead of one continuing into the other. Carrying the last actual
    # month's value into 'forecast' too (not just 'historical') makes it
    # the shared point both lines pass through.
    if historical_points:
        historical_points[-1]['forecast'] = historical_points[-1]['historical']

    return {
        'type': 'line',
        'title': f'Disease Case Trend - Last {len(historical_points)} Months & Next {len(predictions)}-Month Forecast',
        'data': historical_points + forecast_points,
        'series': [
            {'key': 'historical', 'name': 'Actual Cases', 'color': SECONDARY_COLOR},
            {'key': 'forecast', 'name': 'Predicted Cases', 'color': PRIMARY_COLOR},
        ],
        'multi_color': False,
    }


def _revenue_forecast_chart(question: str, monthly_forecast: list):
    """Builds the chart attached to the revenue-forecast live-model gate
    below when the question contains a chart trigger word - same reasoning
    as _disease_trend_chart (this gate also runs before try_chart_intent
    ever gets a look at the question, and this data is a genuine Prophet
    forecast, not a real-SQL aggregation, so it can't just be handled by
    chart_intent.py's _chart_revenue_by_month, which charts ACTUAL past
    revenue instead)."""
    from scripts.rag.chart_intent import CHART_TYPE_PIE, PRIMARY_COLOR
    if not monthly_forecast:
        return None
    data = []
    for row in monthly_forecast:
        try:
            label = datetime.strptime(str(row.get('month')), '%Y-%m').strftime('%b %Y')
        except (ValueError, TypeError):
            label = str(row.get('month'))
        data.append({'label': label, 'revenue': row.get('monthly_revenue', 0)})
    return {
        # See _disease_trend_chart's comment - 'line' by default, a trend
        # over months, not a categorical breakdown.
        'type': 'pie' if CHART_TYPE_PIE.search(question) else 'line',
        'title': f'Forecasted Revenue - Next {len(data)} Months',
        'data': data,
        'series': [{'key': 'revenue', 'name': 'Revenue (Rs.)', 'color': PRIMARY_COLOR}],
        'multi_color': False,
    }


def _inventory_reorder_chart(question: str, recommendations: dict):
    """Builds the chart attached to the inventory-reorder-forecast
    live-model gate below when the question contains a chart trigger word -
    same reasoning as _disease_trend_chart/_revenue_forecast_chart. Distinct
    from chart_intent.py's _chart_inventory_levels, which charts CURRENT
    stock vs reorder level for every active item - this charts the
    suggested order quantity for just the items this forecast actually
    flags as urgent/upcoming, which is what a "what should I reorder"
    question is asking for."""
    from scripts.rag.chart_intent import _requested_chart_type, PRIMARY_COLOR
    items = (recommendations.get('urgent_reorder') or []) + (recommendations.get('reorder_soon') or [])
    if not items:
        return None
    # Already sorted by urgency (days_until_stockout ascending) - top 10
    # matches the row cap every other chart handler in chart_intent.py uses.
    items = items[:10]
    data = [{'label': i['item_name'], 'quantity': i['suggested_order_quantity']} for i in items]
    return {
        'type': _requested_chart_type(question),
        'title': 'Suggested Reorder Quantities',
        'data': data,
        'series': [{'key': 'quantity', 'name': 'Suggested Order Qty', 'color': PRIMARY_COLOR}],
        'multi_color': False,
    }


def _match_live_model_gate(question: str, role: str):
    """
    Pure matching logic shared by _try_live_model_gate (blocking) and the
    streaming route: "explain the current outbreak risk / disease trend
    forecast / revenue forecast / inventory reorder suggestions" can't be
    answered through RAG retrieval - each is a live model computation,
    never ingested into rag_chunks - so the general chat pipeline would
    otherwise hallucinate an answer stitched from tangentially-related
    chunks instead of a real assessment. This runs the (cheap, synchronous)
    model call itself, but stops short of the actual LLM explanation call
    so both the blocking and streaming callers can run that part their own
    way (generate_answer vs stream_chat).

    Returns:
        tuple: (None, None) - no pattern matched, caller should fall through
            to answer_question/stream_answer_question
          ('early', dict) - fully resolved already (role-not-allowed
            message, model-not-loaded message, or a computation error) -
            return/yield as-is, nothing left to generate
          ('explain', dict) - {'output_type', 'data', 'source', 'note',
            'chart'}, everything needed to call (stream_)explain_ml_output
            and finish building the response ('chart' is only non-None when
            the question contained a chart trigger word - see
            _outbreak_risk_chart/_disease_trend_chart/_revenue_forecast_chart/
            _inventory_reorder_chart, one per branch below)
    """
    from scripts.rag.chart_intent import CHART_TRIGGER

    # Staff-only gate: guests/owners asking a general "what do I do
    # during a disease outbreak" question are asking a legitimate
    # general-knowledge question the guest/owner pipeline already
    # handles - only intercept this phrasing for staff, who mean the
    # clinic's own live risk model.
    # Exemption: "outbreak risk/trend" phrasing normally means "what's
    # happening right now" and is deliberately claimed here even for
    # the word "trend" (see the trend-forecast block's comment below) -
    # but a question that also carries real forward-looking language
    # ("forecasted", "predict", "over the next N years") is
    # unambiguously asking for the Prophet trend forecast instead, not
    # a 30-day snapshot with none of the historical/forecast/demographic
    # detail that block actually answers with. Let those fall through.
    _outbreak_forecast_intent = re.search(
        rf'\bforecast(?:ed|s)?\b|\bpredict(?:ed|ion|s)?\b|\bover\s+the\s+next\b|'
        rf'\bnext\s+{_NUMBER_PATTERN}\s*(?:day|week|month|year)s?\b',
        question, re.IGNORECASE
    )
    if role in ('admin', 'veterinarian', 'receptionist') and re.search(
        r'outbreak\s*(risk|trend)|disease\s+outbreak', question, re.IGNORECASE
    ) and not _outbreak_forecast_intent:
        if role not in ('admin', 'veterinarian'):
            return 'early', {
                'answer': _with_clinical_detail_note((
                    "Disease outbreak risk assessments aren't available through "
                    "this assistant for your role - check the Analytics page, "
                    "or ask a veterinarian or admin."
                ), question, role),
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        if not disease_model:
            return 'early', {
                'answer': "The outbreak risk model isn't loaded right now - please try again shortly.",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        risk_assessment = disease_model.predict_outbreak_risk(days_lookback=30)
        # No forward-looking-window note needed here anymore: the
        # _outbreak_forecast_intent exemption above already routes any
        # question with real forecast language away from this block
        # before it can be answered as a 30-day snapshot, so this block
        # only ever fires for genuine "what's happening right now"
        # questions.
        return 'explain', {
            'output_type': 'outbreak_risk',
            'data': risk_assessment,
            'source': {'source_type': 'outbreak_risk_model', 'source_id': 'current', 'metadata': risk_assessment},
            'note': None,
            # This whole gate runs before rag_service.answer_question (and
            # therefore before try_chart_intent) ever gets a look at the
            # question - so "graph/chart the outbreak risk" would otherwise
            # always get the plain-text explanation below, never a chart,
            # no matter how explicitly a picture was asked for. Attach one
            # directly here, scoped to the SAME 30-day window risk_assessment
            # just used, rather than falling through to a differently-scoped
            # all-time chart.
            'chart': _outbreak_risk_chart(question) if CHART_TRIGGER.search(question) else None
        }

    # "Disease prediction/forecast for the next N months/years" is a
    # distinct live-model computation from outbreak risk above -
    # forecast_disease_trends() is a genuine forward-looking Prophet
    # forecast (predictions per period, trend direction, pandemic risk
    # index), not a current risk-level snapshot. Never ingested into
    # rag_chunks, same reasoning as everywhere else in this block: fell
    # through to plain RAG retrieval before this existed, which had
    # nothing relevant to retrieve and hallucinated an answer stitched
    # from unrelated pet medical records instead. Checked after the
    # outbreak-risk block on purpose - a bare "disease outbreak trend"
    # (no forecast language) still hits that block above, not this one;
    # but that block now exempts questions carrying real forward-looking
    # language ("forecasted", "predict", "over the next N years"), so
    # e.g. "outbreak risk trend over the next 3 years, historical vs
    # forecasted cases" falls through and lands here instead.
    if role in ('admin', 'veterinarian', 'receptionist') and re.search(
        r'\bdiseases?\b.*\b(?:predict(?:ed|ion)?|forecast(?:ed)?|trend)\b|'
        r'\b(?:predict(?:ed|ion)?|forecast(?:ed)?)\b.*\bdiseases?\b',
        question, re.IGNORECASE
    ):
        if role not in ('admin', 'veterinarian'):
            return 'early', {
                'answer': _with_clinical_detail_note((
                    "Disease trend forecasts aren't available through this "
                    "assistant for your role - check the Analytics page, "
                    "or ask a veterinarian or admin."
                ), question, role),
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        if not disease_model:
            return 'early', {
                'answer': "The disease prediction model isn't loaded right now - please try again shortly.",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        months, was_clamped = _extract_time_horizon(question, unit='months', default=12, minimum=1, maximum=60)
        trends = disease_model.forecast_disease_trends(periods_months=months)
        if 'error' in trends:
            return 'early', {
                'answer': f"Couldn't generate a disease trend forecast right now: {trends['error']}",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        # 'predictions', 'activity_forecast' (one row per forecasted
        # month each - up to 60 rows at the max horizon) and
        # 'category_trend' (one list per disease category) are the
        # detailed series behind the summary fields (trend_direction,
        # peak_month, totals, pandemic_risk, etc.) - same "don't bloat
        # the prompt" reasoning as daily_forecast/sufficient_stock above.
        condensed_trends = {
            k: v for k, v in trends.items()
            if k not in ('predictions', 'activity_forecast', 'category_trend')
        }
        return 'explain', {
            'output_type': 'disease_trend_forecast',
            'data': condensed_trends,
            'source': {'source_type': 'disease_trend_forecast_model', 'source_id': 'current', 'metadata': {}},
            'note': (
                f"\n\n(Note: the disease prediction model forecasts up to 60 months ahead, so this "
                f"reflects a {months}-month window rather than the full period you asked about.)"
            ) if was_clamped else None,
            'chart': _disease_trend_chart(question, trends.get('predictions')) if CHART_TRIGGER.search(question) else None
        }

    # "Forecast/predict revenue" is the same shape of problem as outbreak
    # risk above - a live model computation, never ingested into
    # rag_chunks. Distinct from BILLING_REVENUE_TIMEFRAME in
    # structured_query.py, which reports ACTUAL past/current revenue from
    # real billing rows via SQL - this is a genuine forward-looking
    # prediction, so it needs the trained sales model, not a query.
    if re.search(
        r'\b(?:forecast|predict(?:ed|ion)?|project(?:ed|ion)?|expect(?:ed)?)\b.*\b(?:revenue|sales|income)\b|'
        r'\b(?:revenue|sales|income)\b.*\b(?:forecast|predict(?:ed|ion)?|project(?:ed|ion)?|expect(?:ed)?)\b',
        question, re.IGNORECASE
    ):
        if role not in ('admin', 'veterinarian'):
            return 'early', {
                'answer': _with_clinical_detail_note((
                    "Revenue forecasts aren't available through this assistant "
                    "for your role - check the Analytics page, or ask an admin."
                ), question, role),
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        if not sales_model:
            return 'early', {
                'answer': "The sales forecasting model isn't loaded right now - please try again shortly.",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        days, was_clamped = _extract_time_horizon(question, unit='days', default=90)
        forecast = sales_model.forecast_revenue(periods=days)
        if 'error' in forecast:
            return 'early', {
                'answer': f"Couldn't generate a revenue forecast right now: {forecast['error']}",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        # forecast_revenue's 'daily_forecast' is ~90+ individual rows -
        # far more detail than a chat explanation needs and large enough
        # to bloat the local model's prompt for no benefit; the monthly
        # rollup is what a plain-language summary should be grounded in.
        condensed_forecast = {
            k: v for k, v in forecast.items() if k != 'daily_forecast'
        }
        return 'explain', {
            'output_type': 'sales_forecast',
            'data': condensed_forecast,
            'source': {'source_type': 'sales_forecast_model', 'source_id': 'current', 'metadata': {}},
            'note': (
                f"\n\n(Note: the sales model forecasts up to 365 days ahead, so this reflects "
                f"a {days}-day window rather than the full period you asked about.)"
            ) if was_clamped else None,
            'chart': _revenue_forecast_chart(question, forecast.get('monthly_forecast')) if CHART_TRIGGER.search(question) else None
        }

    # "What should we reorder/restock soon" - clinic-wide inventory
    # demand forecast, same live-model reasoning as above. Distinct from
    # structured_query.py's INVENTORY_LOW_STOCK/INVENTORY_EXPIRING, which
    # report CURRENT stock levels via SQL - this is a forward-looking
    # demand prediction from the trained inventory model.
    if re.search(
        r'\b(?:reorder|restock)\b.*\b(?:suggest|recommend|predict|forecast|need)\b|'
        # Bounded gap (not a bare .*) between "what" and "should/do" so a
        # noun in between - "what items/products/supplies should we
        # reorder" - still matches, without letting the alternative
        # over-match unrelated distant text in a longer question.
        r'\bwhat\b.{0,25}\b(?:should|do)\s+(?:i|we)\s+(?:need\s+to\s+)?(?:reorder|restock)\b|'
        r'\b(?:inventory|stock)\b.*\b(?:demand\s+)?(?:forecast|predict(?:ion)?)\b|'
        r'\b(?:inventory|stock)\s+demand\b',
        question, re.IGNORECASE
    ):
        if role not in ('admin', 'veterinarian'):
            return 'early', {
                'answer': _with_clinical_detail_note((
                    "Inventory demand forecasts aren't available through this "
                    "assistant for your role - check the Analytics page, or ask an admin."
                ), question, role),
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        if not inventory_model:
            return 'early', {
                'answer': "The inventory forecasting model isn't loaded right now - please try again shortly.",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        days, was_clamped = _extract_time_horizon(question, unit='days', default=30)
        recommendations = inventory_model.get_reorder_recommendations(days=days)
        if 'error' in recommendations:
            return 'early', {
                'answer': f"Couldn't generate reorder suggestions right now: {recommendations['error']}",
                'sources': [],
                'chunks_used': 0,
                'structured': True
            }

        # 'sufficient_stock' lists every well-stocked item (often most of
        # the catalog) - irrelevant to a "what should I reorder" question
        # and, like daily_forecast above, just bloats the prompt.
        condensed_recommendations = {
            k: v for k, v in recommendations.items() if k != 'sufficient_stock'
        }
        return 'explain', {
            'output_type': 'inventory_forecast',
            'data': condensed_recommendations,
            'source': {'source_type': 'inventory_forecast_model', 'source_id': 'current', 'metadata': {}},
            'note': (
                f"\n\n(Note: the inventory model forecasts up to 365 days ahead, so this reflects "
                f"a {days}-day window rather than the full period you asked about.)"
            ) if was_clamped else None,
            'chart': _inventory_reorder_chart(question, recommendations) if CHART_TRIGGER.search(question) else None
        }

    return None, None


def _try_live_model_gate(question: str, role: str) -> dict:
    """
    Blocking wrapper around _match_live_model_gate, for /api/ml/rag/chat -
    runs the matched explanation call synchronously via explain_ml_output.
    See _match_live_model_gate's docstring for what these four patterns are
    and why they're gated here rather than left to plain RAG retrieval.

    Returns:
        dict: a fully-resolved chat response (matching answer_question's
            shape) if one of the four patterns matched, else None - caller
            should fall through to answer_question.
    """
    from scripts.rag.rag_service import explain_ml_output, _wants_paragraph_and_bullets

    kind, payload = _match_live_model_gate(question, role)
    if kind is None:
        return None
    if kind == 'early':
        return payload

    # Same "only think for explain/summarize questions" gating as
    # answer_question/stream_answer_question in rag_service.py - a plain
    # "what should I reorder soon?" doesn't need the ~24x-slower thinking
    # pass just to turn a JSON model output into a sentence or two.
    think = role == 'admin' and _wants_paragraph_and_bullets(question)
    explanation, reasoning = explain_ml_output(payload['output_type'], payload['data'], think=think, question=question)
    if payload['note']:
        explanation += payload['note']
    return {
        'answer': explanation,
        'sources': [payload['source']],
        'chunks_used': 0,
        **({'reasoning': reasoning} if reasoning else {}),
        **({'chart': payload['chart']} if payload.get('chart') else {})
    }


def _stream_live_model_gate(question: str, role: str):
    """
    Streaming counterpart to _try_live_model_gate, for
    /api/ml/rag/chat/stream - runs the matched explanation call via
    stream_explain_ml_output instead, surfacing reasoning deltas live the
    same way stream_answer_question does for the plain RAG path. See
    _match_live_model_gate's docstring for what these four patterns are.

    Yields:
        dict: {'type': 'reasoning_delta', 'text': str} zero or more times,
            followed by exactly one {'type': 'final', 'result': dict} -
            unless nothing matched, in which case nothing is yielded at all
            (caller should check _match_live_model_gate itself, not this
            generator, to decide whether to fall through - see rag_chat_stream)
    """
    from scripts.rag.rag_service import stream_explain_ml_output, _wants_paragraph_and_bullets

    kind, payload = _match_live_model_gate(question, role)
    if kind is None:
        return
    if kind == 'early':
        yield {'type': 'final', 'result': payload}
        return

    explanation = ''
    reasoning = None
    think = role == 'admin' and _wants_paragraph_and_bullets(question)
    for event in stream_explain_ml_output(payload['output_type'], payload['data'], think=think, question=question):
        if event['type'] == 'reasoning_delta':
            yield event
        elif event['type'] == 'done':
            explanation = event['explanation']
            reasoning = event['reasoning']

    if payload['note']:
        explanation += payload['note']
    result = {'answer': explanation, 'sources': [payload['source']], 'chunks_used': 0}
    if reasoning:
        result['reasoning'] = reasoning
    if payload.get('chart'):
        result['chart'] = payload['chart']
    yield {'type': 'final', 'result': result}


@app.route('/api/ml/rag/chat', methods=['POST'])
def rag_chat():
    """
    Ask the AI assistant a question, grounded in scoped clinic data.
    Body: {
        "question": "Summarize Bella's medical history",
        "role": "veterinarian" | "receptionist" | "admin" | "pet_owner" | "guest",
        "customer_id": "CUST-0001",  # required when role == "pet_owner"
        "user_id": "USR-0001",       # staff only - enables "my"/"mine" appointment charts
        "history": [{"role": "user"|"assistant", "content": "..."}, ...],  # optional, staff write-actions only
        "pending_intent": {"type": "book_appointment", "slots": {...}}     # optional, echoed back mid-flow
    }
    NOTE: role/customer_id/user_id must be derived from the authenticated user on
    the Node backend, never trusted from an unauthenticated client directly.
    """
    try:
        from scripts.rag.rag_service import answer_question
        data = request.get_json(force=True)

        question = (data.get('question') or '').strip()
        role = data.get('role', 'guest')
        customer_id = data.get('customer_id')
        user_id = data.get('user_id')
        history = data.get('history')
        pending_intent = data.get('pending_intent')

        if not question:
            return jsonify({'success': False, 'error': 'question is required'}), 400

        gate_result = _try_live_model_gate(question, role)
        if gate_result is not None:
            return jsonify({'success': True, **gate_result}), 200

        result = answer_question(
            question, role=role, customer_id=customer_id, user_id=user_id,
            history=history, pending_intent=pending_intent
        )
        return jsonify({'success': True, **result}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/ml/rag/chat/stream', methods=['POST'])
def rag_chat_stream():
    """
    Real-time streaming counterpart to /api/ml/rag/chat, for the admin-only
    "show reasoning live" chat view. Same request body. The response is
    Server-Sent Events (text/event-stream) instead of a single JSON body:
    each event is a `data: <json>\\n\\n` line, where the json is one of:
        {"type": "reasoning_delta", "text": str} - zero or more, as the
            model thinks (only ever happens for role == "admin" - see
            stream_answer_question)
        {"type": "final", "success": true, ...} - always exactly one, the
            last event, same shape as /api/ml/rag/chat's JSON body

    The four live-model gates (outbreak risk, disease trend forecast,
    revenue forecast, inventory reorder suggestions) and the plain free-form
    RAG generation path (answer_question's fallback, once every other
    early-return branch - write-actions, clinical tools, pet health, charts,
    structured SQL - has passed on the question) are both actually streamed
    token-by-token, since both make a live model call worth watching in real
    time. Every early-return branch inside those (role-not-allowed messages,
    model-not-loaded messages, deterministic SQL answers, write-action
    proposals, etc.) still resolves synchronously and cheaply and is emitted
    as a single immediate 'final' event, identical to what the blocking
    endpoint would have returned for the same question.
    """
    from scripts.rag.rag_service import stream_answer_question

    data = request.get_json(force=True)
    question = (data.get('question') or '').strip()
    role = data.get('role', 'guest')
    customer_id = data.get('customer_id')
    user_id = data.get('user_id')
    history = data.get('history')
    pending_intent = data.get('pending_intent')

    if not question:
        return jsonify({'success': False, 'error': 'question is required'}), 400

    def _sse():
        try:
            # _stream_live_model_gate yields nothing at all if none of the
            # four patterns matched - peek the first event (running
            # _match_live_model_gate exactly once, not once to check and
            # again inside the generator) to decide whether to fall through
            # to stream_answer_question, then replay it before the rest.
            gate_events = _stream_live_model_gate(question, role)
            first_gate_event = next(gate_events, None)
            if first_gate_event is not None:
                for event in itertools.chain([first_gate_event], gate_events):
                    if event['type'] == 'final':
                        yield f'data: {json.dumps({"type": "final", "success": True, **event["result"]})}\n\n'
                    else:
                        yield f'data: {json.dumps(event)}\n\n'
                return

            for event in stream_answer_question(
                question, role=role, customer_id=customer_id, user_id=user_id,
                history=history, pending_intent=pending_intent
            ):
                if event['type'] == 'final':
                    yield f'data: {json.dumps({"type": "final", "success": True, **event["result"]})}\n\n'
                else:
                    yield f'data: {json.dumps(event)}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"type": "final", "success": False, "error": str(e)})}\n\n'

    return Response(stream_with_context(_sse()), mimetype='text/event-stream')


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
    # 127.0.0.1 by default - this service has no auth of its own beyond the
    # shared-secret check above, and trusts caller-supplied role/customer_id.
    # Only bind wider (ML_HOST=0.0.0.0) in a deployment where the Node
    # backend reaches this service over a network hop, and only alongside
    # ML_INTERNAL_TOKEN being set.
    host = os.getenv('ML_HOST', '127.0.0.1')
    print(f"Starting ML Service on {host}:{port}...")
    print(f"Health check: http://localhost:{port}/api/ml/health")
    app.run(host=host, port=port, debug=app.config['DEBUG'])