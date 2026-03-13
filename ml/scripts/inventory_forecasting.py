"""
Inventory Demand Forecasting ML Model - Phase 3
VetCare Pro - Machine Learning Module

Models:
- Random Forest Regressor: Per-item demand prediction
- Linear Regression: Reorder point optimization
- Statistical: Seasonal demand patterns

Data sources:
- inventory table (stock levels, reorder levels)
- billing_items table (consumption history derived from sales)
"""

import sys
import os
import json
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.db_connection import get_db_connection
from utils.model_base import BaseMLModel


class InventoryForecastingModel(BaseMLModel):
    """
    Inventory Demand Forecasting Model for VetCare Pro.
    Predicts stock demand, optimizes reorder points, and identifies fast-moving items.
    """

    def __init__(self):
        super().__init__('inventory_forecasting')
        self.demand_model = None
        self.reorder_model = None
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.feature_columns = []
        self.inventory_data = None
        self.consumption_data = None
        self.item_stats = {}
        self.metrics = {}
        self.category_map = {}

    # -------------------------------------------------------------------------
    # Data Loading
    # -------------------------------------------------------------------------

    def load_inventory_data(self):
        """Load inventory and consumption data from PostgreSQL."""
        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Could not connect to PostgreSQL database.")

        try:
            cursor = conn.cursor()

            # Current inventory snapshot
            cursor.execute("""
                SELECT
                    item_id,
                    item_code,
                    item_name,
                    category,
                    quantity,
                    unit_cost,
                    selling_price,
                    reorder_level,
                    reorder_quantity,
                    last_restock_date,
                    expiry_date,
                    is_active,
                    created_at
                FROM inventory
                WHERE is_active = true
                ORDER BY category, item_name
            """)
            inv_rows = cursor.fetchall()
            inventory_df = pd.DataFrame(inv_rows, columns=[
                'item_id', 'item_code', 'item_name', 'category',
                'quantity', 'unit_cost', 'selling_price', 'reorder_level',
                'reorder_quantity', 'last_restock_date', 'expiry_date',
                'is_active', 'created_at'
            ])

            # Consumption history from billing_items (proxy for usage)
            cursor.execute("""
                SELECT
                    bi.item_id,
                    bi.item_name,
                    bi.item_type,
                    DATE(b.bill_date) AS usage_date,
                    SUM(bi.quantity) AS quantity_used,
                    SUM(bi.total_price) AS revenue_generated,
                    COUNT(bi.billing_item_id) AS transaction_count
                FROM billing_items bi
                JOIN billing b ON bi.bill_id = b.bill_id
                WHERE b.payment_status IN ('paid', 'partial')
                  AND bi.item_id IS NOT NULL
                  AND b.bill_date IS NOT NULL
                GROUP BY bi.item_id, bi.item_name, bi.item_type, DATE(b.bill_date)
                ORDER BY bi.item_id, usage_date
            """)
            usage_rows = cursor.fetchall()
            consumption_df = pd.DataFrame(usage_rows, columns=[
                'item_id', 'item_name', 'item_type', 'usage_date',
                'quantity_used', 'revenue_generated', 'transaction_count'
            ])

            # Monthly consumption by category
            cursor.execute("""
                SELECT
                    bi.item_type AS category,
                    EXTRACT(YEAR FROM b.bill_date)::int AS year,
                    EXTRACT(MONTH FROM b.bill_date)::int AS month,
                    SUM(bi.quantity) AS total_quantity,
                    SUM(bi.total_price) AS total_revenue,
                    COUNT(DISTINCT bi.item_id) AS unique_items
                FROM billing_items bi
                JOIN billing b ON bi.bill_id = b.bill_id
                WHERE b.payment_status IN ('paid', 'partial')
                  AND b.bill_date IS NOT NULL
                GROUP BY bi.item_type, EXTRACT(YEAR FROM b.bill_date), EXTRACT(MONTH FROM b.bill_date)
                ORDER BY year, month, category
            """)
            cat_rows = cursor.fetchall()
            category_df = pd.DataFrame(cat_rows, columns=[
                'category', 'year', 'month', 'total_quantity', 'total_revenue', 'unique_items'
            ])

            cursor.close()
            conn.close()

            return inventory_df, consumption_df, category_df

        except Exception as e:
            conn.close()
            raise RuntimeError(f"Error loading inventory data: {str(e)}")

    # -------------------------------------------------------------------------
    # Feature Engineering
    # -------------------------------------------------------------------------

    def compute_item_statistics(self, inventory_df, consumption_df):
        """Compute per-item demand statistics."""
        stats = {}

        if consumption_df.empty:
            # No consumption data — use inventory metadata only
            for _, row in inventory_df.iterrows():
                item_id = int(row['item_id'])
                stats[item_id] = {
                    'item_id': item_id,
                    'item_name': str(row['item_name']),
                    'category': str(row['category']),
                    'current_stock': int(row['quantity'] or 0),
                    'reorder_level': int(row['reorder_level'] or 0),
                    'reorder_quantity': int(row['reorder_quantity'] or 0),
                    'avg_daily_demand': 0,
                    'std_daily_demand': 0,
                    'total_consumed': 0,
                    'days_observed': 0,
                    'lead_time_days': 7  # default
                }
            return stats

        consumption_df = consumption_df.copy()
        consumption_df['usage_date'] = pd.to_datetime(consumption_df['usage_date'])

        for _, inv_row in inventory_df.iterrows():
            item_id = int(inv_row['item_id'])
            item_consumption = consumption_df[consumption_df['item_id'] == item_id]

            if item_consumption.empty:
                avg_demand = 0
                std_demand = 0
                total_consumed = 0
                days_obs = 0
                trend = 0
            else:
                daily_usage = item_consumption.groupby('usage_date')['quantity_used'].sum()
                # Fill missing days with 0
                if len(daily_usage) > 1:
                    date_range = pd.date_range(daily_usage.index.min(), daily_usage.index.max(), freq='D')
                    daily_usage = daily_usage.reindex(date_range, fill_value=0)

                avg_demand = float(daily_usage.mean())
                std_demand = float(daily_usage.std()) if len(daily_usage) > 1 else 0
                total_consumed = float(item_consumption['quantity_used'].sum())
                days_obs = len(daily_usage)

                # Trend (slope of linear fit on weekly aggregates)
                trend = 0
                if len(daily_usage) >= 14:
                    weekly = daily_usage.resample('W').sum()
                    if len(weekly) >= 3:
                        x = np.arange(len(weekly)).reshape(-1, 1)
                        lr = LinearRegression().fit(x, weekly.values)
                        trend = float(lr.coef_[0])

            stats[item_id] = {
                'item_id': item_id,
                'item_name': str(inv_row['item_name']),
                'category': str(inv_row['category']),
                'current_stock': int(inv_row['quantity'] or 0),
                'reorder_level': int(inv_row['reorder_level'] or 0),
                'reorder_quantity': int(inv_row['reorder_quantity'] or 0),
                'unit_cost': float(inv_row['unit_cost'] or 0),
                'selling_price': float(inv_row['selling_price'] or 0),
                'avg_daily_demand': round(avg_demand, 4),
                'std_daily_demand': round(std_demand, 4),
                'total_consumed': round(total_consumed, 2),
                'days_observed': days_obs,
                'demand_trend': round(trend, 6),
                'lead_time_days': 7  # configurable default
            }

        return stats

    def build_training_dataset(self, item_stats):
        """Build feature matrix for demand prediction model."""
        rows = []
        for item_id, s in item_stats.items():
            if s['avg_daily_demand'] > 0 or s['total_consumed'] > 0:
                rows.append({
                    'item_id': item_id,
                    'category': s['category'],
                    'current_stock': s['current_stock'],
                    'reorder_level': s['reorder_level'],
                    'reorder_quantity': s['reorder_quantity'],
                    'unit_cost': s['unit_cost'],
                    'avg_daily_demand': s['avg_daily_demand'],
                    'std_daily_demand': s['std_daily_demand'],
                    'demand_trend': s['demand_trend'],
                    'days_observed': s['days_observed'],
                    'stock_coverage_days': (
                        s['current_stock'] / s['avg_daily_demand']
                        if s['avg_daily_demand'] > 0 else 999
                    )
                })

        if not rows:
            return pd.DataFrame()

        df = pd.DataFrame(rows)

        # Encode category
        all_categories = df['category'].unique().tolist()
        self.category_map = {cat: i for i, cat in enumerate(all_categories)}
        df['category_encoded'] = df['category'].map(self.category_map)

        return df

    # -------------------------------------------------------------------------
    # Model Training
    # -------------------------------------------------------------------------

    def train_demand_predictor(self, df):
        """Train model to predict 30-day demand from current stock/usage data."""
        feature_cols = [
            'category_encoded', 'current_stock', 'reorder_level', 'reorder_quantity',
            'unit_cost', 'avg_daily_demand', 'std_daily_demand', 'demand_trend', 'days_observed'
        ]
        available = [c for c in feature_cols if c in df.columns]
        self.feature_columns = available

        if len(df) < 3:
            return None, {'error': 'Insufficient items for training'}

        # Target: projected 30-day demand
        df['demand_30d'] = df['avg_daily_demand'] * 30 * (1 + df['demand_trend'].clip(-0.5, 0.5))
        df['demand_30d'] = df['demand_30d'].clip(lower=0)

        X = df[available].values
        y = df['demand_30d'].values

        if len(X) >= 6:
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        else:
            X_train, X_test, y_train, y_test = X, X, y, y

        X_train_s = self.scaler.fit_transform(X_train)
        X_test_s = self.scaler.transform(X_test)

        model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_leaf=2,
            random_state=42
        )
        model.fit(X_train_s, y_train)

        y_pred = model.predict(X_test_s)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        metrics = {
            'mae': round(float(mae), 4),
            'r2_score': round(float(r2), 4),
            'train_samples': int(len(X_train)),
            'items_trained': int(len(df))
        }

        return model, metrics

    def train(self):
        """Full training pipeline."""
        print("Loading inventory and consumption data...")
        inventory_df, consumption_df, category_df = self.load_inventory_data()

        if inventory_df.empty:
            return {'status': 'error', 'message': 'No inventory data found'}

        print(f"Loaded {len(inventory_df)} inventory items, {len(consumption_df)} consumption records")

        # Compute item statistics
        print("Computing item demand statistics...")
        self.item_stats = self.compute_item_statistics(inventory_df, consumption_df)

        # Build training dataset
        training_df = self.build_training_dataset(self.item_stats)

        if training_df.empty:
            return {
                'status': 'warning',
                'message': 'No consumption data found. Model trained with metadata only.',
                'item_count': len(self.item_stats)
            }

        # Train demand predictor
        print("Training demand prediction model...")
        demand_model, demand_metrics = self.train_demand_predictor(training_df)
        self.demand_model = demand_model

        self.metrics = {
            'demand_model': demand_metrics,
            'items_with_consumption_data': len(training_df),
            'total_inventory_items': len(inventory_df)
        }

        # Save model
        self.save_model({
            'demand_model': self.demand_model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'item_stats': self.item_stats,
            'category_map': self.category_map,
            'training_data': {
                'inventory_items': len(inventory_df),
                'consumption_records': len(consumption_df),
                'items_with_history': len(training_df)
            }
        })

        return {
            'status': 'success',
            'message': 'Inventory forecasting model trained successfully',
            'metrics': self.metrics,
            'summary': {
                'inventory_items': len(inventory_df),
                'consumption_records': len(consumption_df),
                'items_with_history': len(training_df)
            }
        }

    def load_trained_model(self):
        """Load persisted model from disk."""
        model_data = self.load_model()
        if model_data:
            self.demand_model = model_data.get('demand_model')
            self.scaler = model_data.get('scaler', StandardScaler())
            self.feature_columns = model_data.get('feature_columns', [])
            self.item_stats = model_data.get('item_stats', {})
            self.category_map = model_data.get('category_map', {})
            return True
        return False

    # -------------------------------------------------------------------------
    # Prediction Methods
    # -------------------------------------------------------------------------

    def predict_item_demand(self, item_id, days=30):
        """Predict demand for a specific inventory item over N days."""
        if not self.item_stats:
            if not self.load_trained_model():
                self.train()

        item_id = int(item_id)
        if item_id not in self.item_stats:
            return {'error': f'Item ID {item_id} not found in model data'}

        s = self.item_stats[item_id]
        avg_daily = s['avg_daily_demand']
        trend = s['demand_trend']
        std = s['std_daily_demand']
        lead_time = s['lead_time_days']
        current_stock = s['current_stock']
        reorder_level = s['reorder_level']
        reorder_qty = s['reorder_quantity']

        # Predicted demand for the period
        base_demand = avg_daily * days
        trend_adjustment = trend * (days / 7)
        predicted_demand = max(0, base_demand + trend_adjustment)

        # Safety stock (Z=1.65 for 95% service level)
        safety_stock = 1.65 * std * np.sqrt(lead_time) if std > 0 else reorder_level * 0.2

        # Reorder point optimization
        optimal_reorder_point = max(
            reorder_level,
            int(np.ceil(avg_daily * lead_time + safety_stock))
        )

        # Days until stockout
        days_until_stockout = int(current_stock / avg_daily) if avg_daily > 0 else 999

        # Should reorder?
        should_reorder = current_stock <= optimal_reorder_point

        # Suggested reorder quantity
        economic_order_qty = reorder_qty if reorder_qty > 0 else max(
            int(np.ceil(predicted_demand)),
            int(safety_stock * 2)
        )

        return {
            'item_id': item_id,
            'item_name': s['item_name'],
            'category': s['category'],
            'current_stock': current_stock,
            'predicted_demand': round(predicted_demand, 2),
            'avg_daily_demand': round(avg_daily, 4),
            'demand_trend': 'increasing' if trend > 0.05 else ('decreasing' if trend < -0.05 else 'stable'),
            'demand_trend_value': round(trend, 6),
            'days_until_stockout': days_until_stockout,
            'should_reorder': should_reorder,
            'optimal_reorder_point': optimal_reorder_point,
            'suggested_order_quantity': economic_order_qty,
            'safety_stock': round(safety_stock, 2),
            'forecast_period_days': days,
            'confidence': 'high' if s['days_observed'] > 30 else ('medium' if s['days_observed'] > 7 else 'low')
        }

    def get_reorder_recommendations(self):
        """Get all items that need to be reordered soon."""
        if not self.item_stats:
            if not self.load_trained_model():
                self.train()

        urgent = []       # reorder now
        upcoming = []     # reorder within 7 days
        sufficient = []   # stock sufficient

        for item_id, s in self.item_stats.items():
            avg_daily = s['avg_daily_demand']
            current_stock = s['current_stock']
            reorder_level = s['reorder_level']
            lead_time = s.get('lead_time_days', 7)

            days_until_stockout = int(current_stock / avg_daily) if avg_daily > 0 else 999

            rec = {
                'item_id': item_id,
                'item_name': s['item_name'],
                'category': s['category'],
                'current_stock': current_stock,
                'reorder_level': reorder_level,
                'avg_daily_demand': round(avg_daily, 4),
                'days_until_stockout': days_until_stockout,
                'suggested_order_quantity': max(
                    s['reorder_quantity'],
                    int(np.ceil(avg_daily * 30))
                ),
                'estimated_cost': round(
                    max(s['reorder_quantity'], int(avg_daily * 30)) * s.get('unit_cost', 0), 2
                )
            }

            if current_stock <= reorder_level or days_until_stockout <= lead_time:
                urgent.append(rec)
            elif days_until_stockout <= lead_time + 7:
                upcoming.append(rec)
            else:
                sufficient.append(rec)

        # Sort by urgency
        urgent.sort(key=lambda x: x['days_until_stockout'])
        upcoming.sort(key=lambda x: x['days_until_stockout'])

        total_reorder_cost = sum(r['estimated_cost'] for r in urgent + upcoming)

        return {
            'urgent_reorder': urgent,
            'reorder_soon': upcoming,
            'sufficient_stock': sufficient,
            'summary': {
                'urgent_count': len(urgent),
                'upcoming_count': len(upcoming),
                'sufficient_count': len(sufficient),
                'total_items': len(self.item_stats),
                'estimated_reorder_cost': round(total_reorder_cost, 2)
            }
        }

    def get_fast_moving_items(self, limit=10):
        """Identify fast-moving inventory items."""
        if not self.item_stats:
            if not self.load_trained_model():
                self.train()

        items = []
        for item_id, s in self.item_stats.items():
            if s['avg_daily_demand'] > 0:
                items.append({
                    'item_id': item_id,
                    'item_name': s['item_name'],
                    'category': s['category'],
                    'avg_daily_demand': round(s['avg_daily_demand'], 4),
                    'total_consumed': round(s['total_consumed'], 2),
                    'demand_trend': 'increasing' if s['demand_trend'] > 0.05 else (
                        'decreasing' if s['demand_trend'] < -0.05 else 'stable'
                    ),
                    'current_stock': s['current_stock'],
                    'days_of_stock': int(s['current_stock'] / s['avg_daily_demand']) if s['avg_daily_demand'] > 0 else 999
                })

        items.sort(key=lambda x: x['avg_daily_demand'], reverse=True)
        return {
            'fast_moving_items': items[:limit],
            'slow_moving_items': [i for i in items if i['avg_daily_demand'] < 0.05][:limit],
            'total_active_items': len(items)
        }

    def get_category_demand_analysis(self):
        """Analyze demand patterns by inventory category."""
        if not self.item_stats:
            if not self.load_trained_model():
                self.train()

        category_stats = {}
        for item_id, s in self.item_stats.items():
            cat = s['category']
            if cat not in category_stats:
                category_stats[cat] = {
                    'category': cat,
                    'item_count': 0,
                    'total_avg_daily_demand': 0,
                    'total_current_stock': 0,
                    'items_needing_reorder': 0,
                    'total_consumed': 0
                }

            cs = category_stats[cat]
            cs['item_count'] += 1
            cs['total_avg_daily_demand'] += s['avg_daily_demand']
            cs['total_current_stock'] += s['current_stock']
            cs['total_consumed'] += s['total_consumed']
            if s['current_stock'] <= s['reorder_level']:
                cs['items_needing_reorder'] += 1

        result = list(category_stats.values())
        for r in result:
            r['total_avg_daily_demand'] = round(r['total_avg_daily_demand'], 4)
            r['avg_stock_per_item'] = round(r['total_current_stock'] / r['item_count'], 2) if r['item_count'] > 0 else 0

        result.sort(key=lambda x: x['total_consumed'], reverse=True)
        return {'category_analysis': result}

    def predict_restock_date(self, item_id):
        """Predict when an item will need restocking."""
        prediction = self.predict_item_demand(item_id, days=90)
        if 'error' in prediction:
            return prediction

        days = prediction['days_until_stockout']
        restock_date = (datetime.now() + timedelta(days=max(0, days - prediction['optimal_reorder_point']))).strftime('%Y-%m-%d')
        stockout_date = (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')

        return {
            'item_id': item_id,
            'item_name': prediction['item_name'],
            'current_stock': prediction['current_stock'],
            'avg_daily_demand': prediction['avg_daily_demand'],
            'days_until_stockout': days,
            'estimated_stockout_date': stockout_date,
            'recommended_restock_date': restock_date,
            'should_reorder_now': prediction['should_reorder'],
            'suggested_order_quantity': prediction['suggested_order_quantity']
        }

    def get_model_status(self):
        """Return model status and metadata."""
        loaded = self.load_trained_model()
        return {
            'model_name': 'InventoryForecasting',
            'is_trained': loaded,
            'demand_model_loaded': self.demand_model is not None,
            'items_in_model': len(self.item_stats),
            'categories': list(self.category_map.keys()),
            'metrics': self.metrics
        }


# -------------------------------------------------------------------------
# Main entry point for testing
# -------------------------------------------------------------------------
if __name__ == '__main__':
    print("=== VetCare Pro - Inventory Forecasting Model (Phase 3) ===\n")

    model = InventoryForecastingModel()

    print("Training model...")
    result = model.train()
    print(json.dumps(result, indent=2, default=str))

    print("\nReorder recommendations...")
    recs = model.get_reorder_recommendations()
    summary = recs.get('summary', {})
    print(f"Urgent: {summary.get('urgent_count', 0)} | Upcoming: {summary.get('upcoming_count', 0)} | OK: {summary.get('sufficient_count', 0)}")
    print(f"Estimated reorder cost: ${summary.get('estimated_reorder_cost', 0):,.2f}")

    print("\nFast moving items...")
    fast = model.get_fast_moving_items(limit=5)
    for item in fast.get('fast_moving_items', []):
        print(f"  {item['item_name']}: {item['avg_daily_demand']:.4f} units/day")

    print("\nDone.")
    