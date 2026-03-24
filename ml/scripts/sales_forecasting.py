"""
Sales Forecasting ML Model - Phase 3
VetCare Pro - Machine Learning Module

Models:
- Prophet: Monthly/annual revenue forecasting
- Linear Regression: Service demand prediction
- Seasonal decomposition: Trend + seasonality analysis

Data sources:
- billing table (revenue, payment methods, dates)
- billing_items table (service/product breakdown)
- daily_sales_summary table (aggregated daily data)
"""

import sys
import os
import json
import warnings
warnings.filterwarnings('ignore')

import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config.db_connection import get_raw_db_connection as get_db_connection
from utils.model_base import BaseMLModel

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    print("Warning: Prophet not available. Falling back to linear regression for time-series.")


class SalesForecastingModel(BaseMLModel):
    """
    Sales & Revenue Forecasting Model for VetCare Pro.
    Uses Prophet for time-series forecasting and Random Forest for demand prediction.
    """

    def __init__(self):
        super().__init__('sales_forecasting')
        self.prophet_model = None
        self.demand_model = None
        self.service_models = {}
        self.scaler = StandardScaler()
        self.feature_columns = []
        self.service_categories = []
        self.training_data = None
        self.monthly_summary = None
        self.metrics = {}

    # -------------------------------------------------------------------------
    # Data Loading
    # -------------------------------------------------------------------------

    def load_data(self):
        """Load billing and sales data from PostgreSQL."""
        conn = get_db_connection()
        if not conn:
            raise ConnectionError("Could not connect to PostgreSQL database.")

        try:
            cursor = conn.cursor()

            # --- Billing summary by date ---
            cursor.execute("""
                SELECT
                    DATE(b.bill_date) AS sale_date,
                    SUM(b.total_amount) AS daily_revenue,
                    SUM(b.subtotal) AS daily_subtotal,
                    COUNT(b.bill_id) AS transaction_count,
                    AVG(b.total_amount) AS avg_transaction_value,
                    SUM(CASE WHEN b.payment_method = 'cash' THEN b.total_amount ELSE 0 END) AS cash_revenue,
                    SUM(CASE WHEN b.payment_method = 'card' THEN b.total_amount ELSE 0 END) AS card_revenue,
                    SUM(CASE WHEN b.payment_method = 'bank_transfer' THEN b.total_amount ELSE 0 END) AS bank_revenue
                FROM billing b
                WHERE b.payment_status IN ('fully_paid', 'partially_paid')
                  AND b.bill_date IS NOT NULL
                GROUP BY DATE(b.bill_date)
                ORDER BY sale_date
            """)
            daily_rows = cursor.fetchall()

            billing_df = pd.DataFrame(daily_rows, columns=[
                'sale_date', 'daily_revenue', 'daily_subtotal', 'transaction_count',
                'avg_transaction_value', 'cash_revenue', 'card_revenue', 'bank_revenue'
            ])

            # --- Billing items breakdown (service vs product) ---
            cursor.execute("""
                SELECT
                    DATE(b.bill_date) AS sale_date,
                    bi.item_type,
                    SUM(bi.total_price) AS category_revenue,
                    COUNT(bi.billing_item_id) AS item_count
                FROM billing_items bi
                JOIN billing b ON bi.bill_id = b.bill_id
                WHERE b.payment_status IN ('fully_paid', 'partially_paid')
                  AND b.bill_date IS NOT NULL
                GROUP BY DATE(b.bill_date), bi.item_type
                ORDER BY sale_date, bi.item_type
            """)
            item_rows = cursor.fetchall()

            items_df = pd.DataFrame(item_rows, columns=[
                'sale_date', 'item_type', 'category_revenue', 'item_count'
            ])

            # --- Appointment-based revenue ---
            cursor.execute("""
                SELECT
                    DATE(b.bill_date) AS sale_date,
                    a.appointment_type,
                    SUM(b.total_amount) AS type_revenue,
                    COUNT(b.bill_id) AS appointment_count
                FROM billing b
                JOIN appointments a ON b.appointment_id = a.appointment_id
                WHERE b.payment_status IN ('fully_paid', 'partially_paid')
                  AND b.bill_date IS NOT NULL
                GROUP BY DATE(b.bill_date), a.appointment_type
                ORDER BY sale_date
            """)
            appt_rows = cursor.fetchall()

            appointment_df = pd.DataFrame(appt_rows, columns=[
                'sale_date', 'appointment_type', 'type_revenue', 'appointment_count'
            ])

            cursor.close()
            conn.close()

            return billing_df, items_df, appointment_df

        except Exception as e:
            conn.close()
            raise RuntimeError(f"Error loading sales data: {str(e)}")

    def populate_daily_sales_summary(self, billing_df):
        """Populate the daily_sales_summary table from billing data."""
        conn = get_db_connection()
        if not conn:
            return 0

        try:
            cursor = conn.cursor()
            inserted = 0

            for _, row in billing_df.iterrows():
                sale_date = row['sale_date']
                if pd.isna(sale_date):
                    continue

                cursor.execute("""
                    INSERT INTO daily_sales_summary
                        (summary_date, total_revenue, transaction_count, avg_transaction_value,
                         cash_revenue, card_revenue, bank_transfer_revenue, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (summary_date) DO UPDATE SET
                        total_revenue = EXCLUDED.total_revenue,
                        transaction_count = EXCLUDED.transaction_count,
                        avg_transaction_value = EXCLUDED.avg_transaction_value,
                        cash_revenue = EXCLUDED.cash_revenue,
                        card_revenue = EXCLUDED.card_revenue,
                        bank_transfer_revenue = EXCLUDED.bank_transfer_revenue,
                        created_at = NOW()
                """, (
                    sale_date,
                    float(row['daily_revenue'] or 0),
                    int(row['transaction_count'] or 0),
                    float(row['avg_transaction_value'] or 0),
                    float(row['cash_revenue'] or 0),
                    float(row['card_revenue'] or 0),
                    float(row['bank_revenue'] or 0)
                ))
                inserted += 1

            conn.commit()
            cursor.close()
            conn.close()
            return inserted

        except Exception as e:
            conn.rollback()
            conn.close()
            print(f"Warning: Could not populate daily_sales_summary: {e}")
            return 0

    # -------------------------------------------------------------------------
    # Feature Engineering
    # -------------------------------------------------------------------------

    def prepare_time_series(self, billing_df):
        """Prepare time-series data for Prophet forecasting."""
        df = billing_df.copy()
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df = df.sort_values('sale_date')

        # Fill missing dates with 0 revenue
        date_range = pd.date_range(start=df['sale_date'].min(), end=df['sale_date'].max(), freq='D')
        df = df.set_index('sale_date').reindex(date_range, fill_value=0).reset_index()
        df.rename(columns={'index': 'sale_date'}, inplace=True)

        # Prophet requires 'ds' and 'y' columns
        prophet_df = df[['sale_date', 'daily_revenue']].rename(
            columns={'sale_date': 'ds', 'daily_revenue': 'y'}
        )
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        prophet_df['y'] = pd.to_numeric(prophet_df['y'], errors='coerce').fillna(0)

        return prophet_df

    def prepare_monthly_features(self, billing_df, items_df, appointment_df):
        """Aggregate to monthly level and engineer features."""
        df = billing_df.copy()
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df['year'] = df['sale_date'].dt.year
        df['month'] = df['sale_date'].dt.month

        monthly = df.groupby(['year', 'month']).agg(
            monthly_revenue=('daily_revenue', 'sum'),
            transaction_count=('transaction_count', 'sum'),
            avg_transaction_value=('avg_transaction_value', 'mean'),
            cash_revenue=('cash_revenue', 'sum'),
            card_revenue=('card_revenue', 'sum'),
            bank_revenue=('bank_revenue', 'sum')
        ).reset_index()

        # Lag features for regression
        monthly = monthly.sort_values(['year', 'month'])
        monthly['revenue_lag1'] = monthly['monthly_revenue'].shift(1)
        monthly['revenue_lag2'] = monthly['monthly_revenue'].shift(2)
        monthly['revenue_lag3'] = monthly['monthly_revenue'].shift(3)
        monthly['revenue_rolling3'] = monthly['monthly_revenue'].rolling(3).mean().shift(1)

        # Seasonal features
        monthly['quarter'] = ((monthly['month'] - 1) // 3) + 1
        monthly['is_holiday_season'] = monthly['month'].isin([12, 1]).astype(int)
        monthly['sin_month'] = np.sin(2 * np.pi * monthly['month'] / 12)
        monthly['cos_month'] = np.cos(2 * np.pi * monthly['month'] / 12)

        monthly = monthly.dropna()
        self.monthly_summary = monthly
        return monthly

    # -------------------------------------------------------------------------
    # Model Training
    # -------------------------------------------------------------------------

    def train_prophet_model(self, prophet_df):
        """Train Prophet time-series forecasting model."""
        if not PROPHET_AVAILABLE:
            return None, {'error': 'Prophet library not available'}

        if len(prophet_df) < 14:
            return None, {'error': 'Insufficient data for Prophet (need 14+ days)'}

        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode='multiplicative',
            changepoint_prior_scale=0.05,
            seasonality_prior_scale=10.0
        )

        # Add custom seasonality for veterinary patterns
        model.add_seasonality(name='monthly', period=30.5, fourier_order=5)

        model.fit(prophet_df)

        # In-sample evaluation (last 30 days as pseudo-test)
        cutoff_date = prophet_df['ds'].max() - pd.Timedelta(days=30)
        train_eval = prophet_df[prophet_df['ds'] <= cutoff_date]
        test_eval = prophet_df[prophet_df['ds'] > cutoff_date]

        metrics = {}
        if len(test_eval) > 0 and len(train_eval) > 10:
            future_eval = model.make_future_dataframe(periods=len(test_eval))
            forecast_eval = model.predict(future_eval)
            forecast_test = forecast_eval[forecast_eval['ds'].isin(test_eval['ds'])]['yhat']
            actual_test = test_eval['y'].values

            if len(forecast_test) > 0 and len(actual_test) > 0:
                min_len = min(len(forecast_test), len(actual_test))
                mae = mean_absolute_error(actual_test[:min_len], forecast_test.values[:min_len])
                metrics = {
                    'mae': round(float(mae), 2),
                    'test_days': int(len(test_eval)),
                    'train_days': int(len(train_eval))
                }

        return model, metrics

    def train_demand_model(self, monthly_df):
        """Train Random Forest model for monthly revenue prediction."""
        feature_cols = [
            'month', 'quarter', 'is_holiday_season',
            'sin_month', 'cos_month',
            'revenue_lag1', 'revenue_lag2', 'revenue_lag3', 'revenue_rolling3',
            'transaction_count'
        ]

        available_cols = [c for c in feature_cols if c in monthly_df.columns]
        self.feature_columns = available_cols

        if len(monthly_df) < 4:
            return None, {'error': 'Insufficient monthly data for training'}

        X = monthly_df[available_cols].values
        y = monthly_df['monthly_revenue'].values

        X_all_scaled = self.scaler.fit_transform(X)

        rf = RandomForestRegressor(
            n_estimators=100, max_depth=6,
            min_samples_leaf=2, random_state=42
        )

        # K-fold CV for honest error estimate (when enough months)
        cv_mae = None
        if len(X) >= 6:
            n_splits = min(5, len(X) // 2)
            cv_scores = cross_val_score(rf, X_all_scaled, y, cv=n_splits, scoring='neg_mean_absolute_error')
            cv_mae = round(float(-cv_scores.mean()), 2)
            print(f"   ✓ CV MAE ({n_splits}-fold): {cv_mae:.2f}")

        # Train final model on 80/20 split (or full set when < 6 months)
        if len(X) >= 6:
            X_train, X_test, y_train, y_test = train_test_split(X_all_scaled, y, test_size=0.2, random_state=42)
        else:
            X_train, X_test, y_train, y_test = X_all_scaled, X_all_scaled, y, y

        model = RandomForestRegressor(
            n_estimators=100, max_depth=6,
            min_samples_leaf=2, random_state=42
        )
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        metrics = {
            'mae': round(float(mae), 2),
            'cv_mae': cv_mae,
            'r2_score': round(float(r2), 4),
            'train_samples': int(len(X_train)),
            'test_samples': int(len(X_test)),
            'feature_importances': dict(zip(available_cols, model.feature_importances_.tolist()))
        }

        return model, metrics

    def train(self):
        """Full training pipeline."""
        print("Loading sales data...")
        billing_df, items_df, appointment_df = self.load_data()

        if billing_df.empty:
            return {
                'status': 'error',
                'message': 'No billing data found for training'
            }

        print(f"Loaded {len(billing_df)} daily sales records")

        # Populate daily_sales_summary table
        populated = self.populate_daily_sales_summary(billing_df)
        print(f"Populated {populated} daily_sales_summary records")

        # Prepare data
        prophet_df = self.prepare_time_series(billing_df)
        monthly_df = self.prepare_monthly_features(billing_df, items_df, appointment_df)

        # Train Prophet
        print("Training Prophet time-series model...")
        prophet_model, prophet_metrics = self.train_prophet_model(prophet_df)
        self.prophet_model = prophet_model

        # Train demand model
        print("Training Random Forest demand model...")
        demand_model, demand_metrics = self.train_demand_model(monthly_df)
        self.demand_model = demand_model

        # Store training data reference
        self.training_data = {
            'daily_records': len(billing_df),
            'monthly_records': len(monthly_df),
            'date_range': {
                'start': str(billing_df['sale_date'].min()),
                'end': str(billing_df['sale_date'].max())
            },
            'total_revenue_trained': float(billing_df['daily_revenue'].sum()),
            'categories': items_df['item_type'].unique().tolist() if not items_df.empty else []
        }

        self.metrics = {
            'prophet': prophet_metrics,
            'demand_model': demand_metrics,
            'training_samples': len(billing_df)
        }

        # Save model
        self.model = {
            'prophet_model': self.prophet_model,
            'demand_model': self.demand_model,
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'monthly_summary': self.monthly_summary.to_dict(orient='records') if self.monthly_summary is not None else [],
            'training_data': self.training_data
        }
        self.save_model()

        self._update_model_metadata(
            record_count=self.training_data.get('daily_records', 0),
            cv_mae=self.metrics.get('demand_model', {}).get('cv_mae')
        )

        return {
            'status': 'success',
            'message': 'Sales forecasting models trained successfully',
            'metrics': self.metrics,
            'training_data': self.training_data
        }

    def _update_model_metadata(self, record_count, cv_mae=None):
        """Write training stats to model_metadata table."""
        try:
            conn = get_db_connection()
            if not conn:
                return
            cur = conn.cursor()
            cur.execute("""
                UPDATE model_metadata
                SET last_trained_at       = NOW(),
                    records_at_last_train  = %s,
                    cv_accuracy            = %s,
                    model_version          = model_version + 1,
                    updated_at             = NOW()
                WHERE model_name = 'sales_forecasting'
            """, (record_count, cv_mae))
            conn.commit()
            cur.close()
            conn.close()
            print("   ✓ model_metadata updated")
        except Exception as e:
            print(f"   ⚠ Could not update model_metadata: {e}")

    def load_trained_model(self):
        """Load persisted model from disk."""
        model_data = self.load_model()
        if model_data:
            self.prophet_model = model_data.get('prophet_model')
            self.demand_model = model_data.get('demand_model')
            self.scaler = model_data.get('scaler', StandardScaler())
            self.feature_columns = model_data.get('feature_columns', [])
            self.training_data = model_data.get('training_data', {})
            monthly_records = model_data.get('monthly_summary', [])
            if monthly_records:
                self.monthly_summary = pd.DataFrame(monthly_records)
            return True
        return False

    # -------------------------------------------------------------------------
    # Prediction Methods
    # -------------------------------------------------------------------------

    def forecast_revenue(self, periods=90, freq='D'):
        """
        Forecast revenue for next N periods.
        periods: number of days (or months) to forecast
        freq: 'D' for daily, 'M' for monthly
        """
        if not self.prophet_model:
            if not self.load_trained_model():
                result = self.train()
                if result.get('status') != 'success':
                    return {'error': 'Model training failed', 'details': result}

        if not self.prophet_model:
            return self._fallback_forecast(periods)

        try:
            future = self.prophet_model.make_future_dataframe(periods=periods, freq=freq)
            forecast = self.prophet_model.predict(future)

            # Get only future dates (after the last training date)
            last_train_date = self.prophet_model.history['ds'].max()
            future_forecast = forecast[forecast['ds'] > last_train_date].head(periods)

            result = []
            for _, row in future_forecast.iterrows():
                result.append({
                    'date': row['ds'].strftime('%Y-%m-%d'),
                    'predicted_revenue': max(0, round(float(row['yhat']), 2)),
                    'lower_bound': round(float(row['yhat_lower']), 2),
                    'upper_bound': max(0, round(float(row['yhat_upper']), 2)),
                    'trend': round(float(row['trend']), 2),
                    'weekly_seasonality': round(float(row.get('weekly', 0)), 2),
                    'yearly_seasonality': round(float(row.get('yearly', 0)), 2)
                })

            # Aggregate monthly
            df_result = pd.DataFrame(result)
            df_result['date'] = pd.to_datetime(df_result['date'])
            monthly_agg = df_result.groupby(df_result['date'].dt.to_period('M')).agg(
                monthly_revenue=('predicted_revenue', 'sum'),
                avg_daily_revenue=('predicted_revenue', 'mean'),
            ).reset_index()

            monthly_agg['monthly_revenue'] = pd.to_numeric(monthly_agg['monthly_revenue'], errors='coerce')
            if self.monthly_summary is not None and len(self.monthly_summary) > 1:
                hist_rev = pd.to_numeric(self.monthly_summary['monthly_revenue'], errors='coerce')
                hist_mean = float(hist_rev.mean())
                hist_std = float(hist_rev.std())
                cv = (hist_std / hist_mean) if hist_mean > 0 else 0.20
            else:
                cv = 0.20
            monthly_agg['lower_bound'] = (monthly_agg['monthly_revenue'] * (1 - cv)).clip(lower=0).round(2)
            monthly_agg['upper_bound'] = (monthly_agg['monthly_revenue'] * (1 + cv)).round(2)
            monthly_agg['monthly_revenue'] = monthly_agg['monthly_revenue'].round(2)
            monthly_agg['month'] = monthly_agg['date'].astype(str)
            monthly_agg = monthly_agg.drop(columns=['date'])

            return {
                'daily_forecast': result,
                'monthly_forecast': monthly_agg.to_dict(orient='records'),
                'forecast_period_days': periods,
                'model_used': 'Prophet'
            }

        except Exception as e:
            return {'error': f'Forecast failed: {str(e)}'}

    def _fallback_forecast(self, periods=90):
        """Simple linear trend fallback when Prophet is unavailable."""
        if self.monthly_summary is None or len(self.monthly_summary) == 0:
            return {'error': 'No training data available for fallback forecast'}

        recent = self.monthly_summary.tail(6)
        avg_monthly = float(recent['monthly_revenue'].mean())
        std_monthly = float(recent['monthly_revenue'].std()) if len(recent) > 1 else avg_monthly * 0.1

        # Simple linear projection
        trend = 0
        if len(recent) > 2:
            x = np.arange(len(recent))
            y = recent['monthly_revenue'].values
            lr = LinearRegression().fit(x.reshape(-1, 1), y)
            trend = float(lr.coef_[0])

        monthly_forecast = []
        today = datetime.now()
        for i in range(1, (periods // 30) + 2):
            projected_month = today.month + i
            projected_year = today.year + (projected_month - 1) // 12
            projected_month = ((projected_month - 1) % 12) + 1

            revenue = max(0, avg_monthly + trend * i)
            monthly_forecast.append({
                'month': f"{projected_year}-{projected_month:02d}",
                'monthly_revenue': round(revenue, 2),
                'lower_bound': round(max(0, revenue - std_monthly), 2),
                'upper_bound': round(revenue + std_monthly, 2),
                'avg_daily_revenue': round(revenue / 30, 2)
            })

        return {
            'daily_forecast': [],
            'monthly_forecast': monthly_forecast,
            'forecast_period_days': periods,
            'model_used': 'LinearTrend (fallback)'
        }

    def predict_monthly_revenue(self, month, year):
        """Predict revenue for a specific month/year."""
        if not self.demand_model:
            if not self.load_trained_model():
                self.train()

        if not self.demand_model or not self.feature_columns:
            return self._simple_monthly_estimate(month, year)

        try:
            quarter = ((month - 1) // 3) + 1
            is_holiday = 1 if month in [12, 1] else 0

            # Use recent actuals for lag features
            recent_revenues = []
            if self.monthly_summary is not None and len(self.monthly_summary) > 0:
                recent_revenues = self.monthly_summary['monthly_revenue'].tail(3).tolist()

            while len(recent_revenues) < 3:
                recent_revenues.insert(0, 0)

            feature_map = {
                'month': month,
                'quarter': quarter,
                'is_holiday_season': is_holiday,
                'sin_month': np.sin(2 * np.pi * month / 12),
                'cos_month': np.cos(2 * np.pi * month / 12),
                'revenue_lag1': recent_revenues[-1] if recent_revenues else 0,
                'revenue_lag2': recent_revenues[-2] if len(recent_revenues) > 1 else 0,
                'revenue_lag3': recent_revenues[-3] if len(recent_revenues) > 2 else 0,
                'revenue_rolling3': np.mean(recent_revenues[-3:]) if recent_revenues else 0,
                'transaction_count': self.monthly_summary['transaction_count'].mean() if self.monthly_summary is not None else 10
            }

            X = np.array([[feature_map.get(f, 0) for f in self.feature_columns]])
            X_scaled = self.scaler.transform(X)
            predicted = float(self.demand_model.predict(X_scaled)[0])

            return {
                'month': month,
                'year': year,
                'predicted_revenue': round(max(0, predicted), 2),
                'model_used': 'RandomForest'
            }

        except Exception as e:
            return self._simple_monthly_estimate(month, year)

    def _simple_monthly_estimate(self, month, year):
        """Fallback using historical average."""
        avg = 0
        if self.monthly_summary is not None and len(self.monthly_summary) > 0:
            same_month = self.monthly_summary[self.monthly_summary['month'] == month]
            if len(same_month) > 0:
                avg = float(same_month['monthly_revenue'].mean())
            else:
                avg = float(self.monthly_summary['monthly_revenue'].mean())

        return {
            'month': month,
            'year': year,
            'predicted_revenue': round(avg, 2),
            'model_used': 'HistoricalAverage'
        }

    def get_sales_trends(self, months=12):
        """Get historical sales trends and seasonal patterns."""
        try:
            billing_df, items_df, appointment_df = self.load_data()
            if billing_df.empty:
                return {'error': 'No sales data found'}

            billing_df['sale_date'] = pd.to_datetime(billing_df['sale_date'])
            billing_df['year'] = billing_df['sale_date'].dt.year
            billing_df['month'] = billing_df['sale_date'].dt.month
            billing_df['month_name'] = billing_df['sale_date'].dt.strftime('%b')
            billing_df['day_of_week'] = billing_df['sale_date'].dt.day_name()

            # Monthly trends (last N months)
            cutoff = datetime.now() - timedelta(days=months * 30)
            recent = billing_df[billing_df['sale_date'] >= cutoff]

            monthly = recent.groupby(['year', 'month', 'month_name']).agg(
                revenue=('daily_revenue', 'sum'),
                transactions=('transaction_count', 'sum'),
                avg_daily=('daily_revenue', 'mean')
            ).reset_index().sort_values(['year', 'month'])

            # Day of week patterns
            day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            dow = recent.groupby('day_of_week').agg(
                avg_revenue=('daily_revenue', 'mean'),
                total_transactions=('transaction_count', 'sum')
            ).reset_index()
            dow['day_order'] = pd.Categorical(dow['day_of_week'], categories=day_order, ordered=True)
            dow = dow.sort_values('day_order').drop(columns='day_order').reset_index(drop=True)

            # Service type breakdown
            service_revenue = []
            if not items_df.empty:
                items_df['sale_date'] = pd.to_datetime(items_df['sale_date'])
                recent_items = items_df[items_df['sale_date'] >= cutoff]
                service_rev = recent_items.groupby('item_type').agg(
                    total_revenue=('category_revenue', 'sum'),
                    total_items=('item_count', 'sum')
                ).reset_index()
                service_revenue = service_rev.to_dict(orient='records')

            # Payment method breakdown
            payment_totals = {
                'cash': float(billing_df['cash_revenue'].sum()),
                'card': float(billing_df['card_revenue'].sum()),
                'bank_transfer': float(billing_df['bank_revenue'].sum())
            }

            # YoY comparison — same period this year vs same period last year
            current_year = datetime.now().year
            current_month = datetime.now().month
            curr_ytd = billing_df[
                (billing_df['year'] == current_year) &
                (billing_df['month'] <= current_month)
            ]['daily_revenue'].sum()
            prev_ytd = billing_df[
                (billing_df['year'] == current_year - 1) &
                (billing_df['month'] <= current_month)
            ]['daily_revenue'].sum()
            curr_year_rev = float(curr_ytd)
            prev_year_rev = float(prev_ytd)
            yoy_growth = 0
            if prev_year_rev > 0:
                yoy_growth = round(((curr_year_rev - prev_year_rev) / prev_year_rev) * 100, 2)

            return {
                'monthly_trends': monthly.to_dict(orient='records'),
                'day_of_week_patterns': dow.to_dict(orient='records'),
                'service_revenue_breakdown': service_revenue,
                'payment_method_breakdown': payment_totals,
                'yoy_growth_percentage': yoy_growth,
                'total_revenue_period': float(recent['daily_revenue'].sum()),
                'avg_monthly_revenue': float(monthly['revenue'].mean()) if len(monthly) > 0 else 0,
                'period_months': months
            }

        except Exception as e:
            return {'error': f'Failed to get sales trends: {str(e)}'}

    def get_top_revenue_services(self, limit=10):
        """Get top revenue-generating services/products."""
        try:
            conn = get_db_connection()
            if not conn:
                return {'error': 'Database connection failed'}

            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    bi.item_name,
                    bi.item_type,
                    SUM(bi.total_price) AS total_revenue,
                    SUM(bi.quantity) AS total_quantity,
                    AVG(bi.unit_price) AS avg_price,
                    COUNT(DISTINCT b.bill_id) AS times_billed
                FROM billing_items bi
                JOIN billing b ON bi.bill_id = b.bill_id
                WHERE b.payment_status IN ('fully_paid', 'partially_paid')
                GROUP BY bi.item_name, bi.item_type
                ORDER BY total_revenue DESC
                LIMIT %s
            """, (limit,))

            rows = cursor.fetchall()
            cursor.close()
            conn.close()

            result = []
            for row in rows:
                result.append({
                    'item_name': row[0],
                    'item_type': row[1],
                    'total_revenue': round(float(row[2] or 0), 2),
                    'total_quantity': int(row[3] or 0),
                    'avg_price': round(float(row[4] or 0), 2),
                    'times_billed': int(row[5] or 0)
                })

            return {'top_services': result, 'limit': limit}

        except Exception as e:
            return {'error': f'Failed to fetch top services: {str(e)}'}

    def predict(self, data):
        """Implement abstract method. Routes to forecast_revenue."""
        periods = data.get('periods', 90) if isinstance(data, dict) else 90
        return self.forecast_revenue(periods=periods)

    def get_model_status(self):
        """Return model status and metadata."""
        loaded = self.load_trained_model()
        return {
            'model_name': 'SalesForecasting',
            'is_trained': loaded,
            'prophet_available': PROPHET_AVAILABLE,
            'prophet_model_loaded': self.prophet_model is not None,
            'demand_model_loaded': self.demand_model is not None,
            'training_data': self.training_data or {},
            'metrics': self.metrics
        }


# -------------------------------------------------------------------------
# Main entry point for testing
# -------------------------------------------------------------------------
if __name__ == '__main__':
    print("=== VetCare Pro - Sales Forecasting Model (Phase 3) ===\n")

    model = SalesForecastingModel()

    print("Training model...")
    result = model.train()
    print(json.dumps(result, indent=2, default=str))

    print("\nForecasting next 90 days...")
    forecast = model.forecast_revenue(periods=90)
    if 'error' not in forecast:
        monthly = forecast.get('monthly_forecast', [])
        print(f"Generated {len(monthly)} monthly forecasts using {forecast.get('model_used')}")
        for m in monthly[:3]:
            print(f"  {m.get('month')}: ${m.get('monthly_revenue', 0):,.2f}")
    else:
        print(f"Forecast error: {forecast['error']}")

    print("\nFetching sales trends...")
    trends = model.get_sales_trends(months=12)
    if 'error' not in trends:
        print(f"Monthly trends: {len(trends.get('monthly_trends', []))} months")
        print(f"YoY growth: {trends.get('yoy_growth_percentage')}%")
    else:
        print(f"Trends error: {trends['error']}")

    print("\nDone.")
    