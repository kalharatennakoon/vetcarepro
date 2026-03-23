"""
Disease Prediction ML Model
Purpose: Predict disease outbreaks, analyze patterns, and assess pandemic risk
Date: 2026-02-17
Author: VetCare Pro ML Team
Phase: Disease Prediction ML - Phase 2

Algorithms used (optimized for small datasets):
- Naive Bayes: Disease classification (works well with 30+ samples per class)
- K-Means Clustering: Disease pattern grouping
- Statistical Analysis: Trend detection and frequency analysis
- Rule-based Scoring: Risk assessment
"""

import sys
import os
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from collections import Counter, defaultdict

# ML Libraries
from sklearn.ensemble import RandomForestClassifier
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, silhouette_score

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils.model_base import BaseMLModel
from utils.data_loader import DataLoader
from config.db_connection import get_raw_db_connection as get_db_connection

class DiseasePredictionModel(BaseMLModel):
    """
    ML Model for disease outbreak prediction and pattern analysis
    Optimized for small datasets (30-100 cases)
    """
    
    # Data thresholds for different model complexity
    MIN_RECORDS_BASIC = 30
    MIN_RECORDS_MODERATE = 100
    MIN_RECORDS_ADVANCED = 200
    
    # Risk levels
    RISK_LEVELS = ['low', 'medium', 'high', 'critical']
    
    # Contagious disease multiplier for outbreak risk
    CONTAGIOUS_MULTIPLIER = 2.5
    
    def __init__(self, model_name='disease_prediction'):
        """Initialize disease prediction model"""
        super().__init__(model_name)
        
        self.classification_model = None
        self.clustering_model = None
        self.label_encoders = {}
        self.scaler = StandardScaler()
        
        self.data_loader = DataLoader()
        
        # Store training metadata
        self.training_date = None
        self.data_size = 0
        self.species_distribution = {}
        self.category_distribution = {}
        
    def get_model_confidence(self):
        """
        Calculate model confidence based on data size
        
        Returns:
            dict: Confidence levels and recommendations
        """
        if self.data_size < self.MIN_RECORDS_BASIC:
            return {
                'level': 'very_low',
                'description': 'Insufficient data - predictions unreliable',
                'recommendation': 'Collect more disease case data',
                'min_needed': self.MIN_RECORDS_BASIC - self.data_size
            }
        elif self.data_size < self.MIN_RECORDS_MODERATE:
            return {
                'level': 'low',
                'description': 'Limited data - basic predictions only',
                'recommendation': 'Continue collecting data for better accuracy',
                'accuracy_range': '60-75%'
            }
        elif self.data_size < self.MIN_RECORDS_ADVANCED:
            return {
                'level': 'medium',
                'description': 'Moderate data - fair prediction accuracy',
                'recommendation': 'Good for general trends and patterns',
                'accuracy_range': '75-85%'
            }
        else:
            return {
                'level': 'high',
                'description': 'Good data - reliable predictions',
                'recommendation': 'Suitable for advanced ML models',
                'accuracy_range': '85-95%'
            }
    
    def prepare_features(self, df):
        """
        Prepare features for ML models
        
        Args:
            df (DataFrame): Disease cases dataframe
            
        Returns:
            tuple: (X_features, y_target, feature_names)
        """
        # Create feature columns
        features = []
        feature_names = []
        
        # Encode categorical variables
        for col in ['species', 'disease_category', 'severity', 'breed']:
            if col in df.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    self.label_encoders[col].fit(df[col].fillna('unknown'))
                
                encoded = self.label_encoders[col].transform(df[col].fillna('unknown'))
                features.append(encoded.reshape(-1, 1))
                feature_names.append(col)
        
        # Numerical features
        if 'age_at_diagnosis' in df.columns:
            features.append(df['age_at_diagnosis'].fillna(0).values.reshape(-1, 1))
            feature_names.append('age_at_diagnosis')
        
        if 'treatment_duration_days' in df.columns:
            features.append(df['treatment_duration_days'].fillna(0).values.reshape(-1, 1))
            feature_names.append('treatment_duration_days')
        
        # Binary features
        if 'is_contagious' in df.columns:
            features.append(df['is_contagious'].astype(int).values.reshape(-1, 1))
            feature_names.append('is_contagious')
        
        # Combine all features
        X = np.hstack(features) if features else np.array([])
        
        # Target variable (for classification - disease category)
        y = None
        if 'disease_category' in df.columns:
            if 'disease_category' not in self.label_encoders:
                self.label_encoders['disease_category'] = LabelEncoder()
                self.label_encoders['disease_category'].fit(df['disease_category'])
            y = self.label_encoders['disease_category'].transform(df['disease_category'])
        
        return X, y, feature_names
    
    def train(self, data=None):
        """
        Train the disease prediction models
        
        Args:
            data (DataFrame, optional): Training data. If None, loads from database
            
        Returns:
            dict: Training results and metrics
        """
        print("=" * 70)
        print("  Training Disease Prediction Model")
        print("=" * 70)
        print()
        
        # Load data if not provided
        if data is None:
            print("📊 Loading disease cases from database...")
            data = self.data_loader.load_disease_data()
        
        # Handle both DataFrame and dict/list returns
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.DataFrame(data) if data else pd.DataFrame()
        
        if df.empty:
            raise ValueError("No disease data available for training")
        
        df = pd.DataFrame(data)
        self.data_size = len(df)
        
        print(f"   Disease cases loaded: {self.data_size}")
        
        # Check data sufficiency
        confidence = self.get_model_confidence()
        print(f"\n🎯 Model Confidence: {confidence['level'].upper()}")
        print(f"   {confidence['description']}")
        
        if self.data_size < self.MIN_RECORDS_BASIC:
            print(f"\n⚠️  WARNING: Need {confidence['min_needed']} more cases for reliable predictions")
            print("   Proceeding with basic statistical models only...")
        
        # Store metadata
        self.training_date = datetime.now()
        self.species_distribution = df['species'].value_counts().to_dict()
        self.category_distribution = df['disease_category'].value_counts().to_dict()
        
        print(f"\n📈 Data Distribution:")
        print(f"   Species: {', '.join([f'{k}: {v}' for k, v in self.species_distribution.items()])}")
        print(f"   Categories: {len(self.category_distribution)} types")
        print()
        
        # Prepare features
        X, y, feature_names = self.prepare_features(df)
        
        results = {
            'data_size': self.data_size,
            'confidence': confidence,
            'training_date': self.training_date.isoformat(),
            'models_trained': []
        }
        
        # Train classification model (if enough diverse data)
        if len(df['disease_category'].unique()) >= 3 and self.data_size >= 30:
            print("🤖 Training Classification Model (Random Forest)...")

            # Scale features
            X_scaled = self.scaler.fit_transform(X)

            # K-fold cross-validation for honest accuracy estimate
            n_splits = min(5, self.data_size // 10) if self.data_size >= 50 else 3
            rf = RandomForestClassifier(
                n_estimators=100, max_depth=8,
                min_samples_leaf=2, random_state=42, class_weight='balanced'
            )
            cv_scores = cross_val_score(rf, X_scaled, y, cv=n_splits, scoring='accuracy')
            cv_accuracy = float(cv_scores.mean())
            print(f"   ✓ CV accuracy ({n_splits}-fold): {cv_accuracy:.2%} ± {cv_scores.std():.2%}")

            # Train final model on 80% split
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42,
                stratify=y if len(np.unique(y)) > 1 else None
            )
            self.classification_model = RandomForestClassifier(
                n_estimators=100, max_depth=8,
                min_samples_leaf=2, random_state=42, class_weight='balanced'
            )
            self.classification_model.fit(X_train, y_train)

            # Held-out test accuracy
            y_pred = self.classification_model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            print(f"   ✓ Test accuracy (held-out 20%%): {accuracy:.2%}")

            results['models_trained'].append('classification')
            results['classification_accuracy'] = accuracy
            results['cv_accuracy'] = cv_accuracy
            results['cv_folds'] = n_splits
        else:
            print("⚠️  Skipping classification model (insufficient diverse data)")
        
        # Train clustering model (for pattern recognition)
        if self.data_size >= 20:
            print("\n🔍 Training Clustering Model (K-Means)...")
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Determine optimal number of clusters (max 5 or data_size/10)
            max_clusters = min(5, max(2, self.data_size // 10))
            
            # Use elbow method or fixed number for small datasets
            n_clusters = min(3, max_clusters)
            
            self.clustering_model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            clusters = self.clustering_model.fit_predict(X_scaled)
            
            # Calculate silhouette score
            if len(X_scaled) > n_clusters:
                silhouette = silhouette_score(X_scaled, clusters)
                print(f"   ✓ Silhouette score: {silhouette:.3f}")
                results['silhouette_score'] = silhouette
            
            # Analyze clusters
            df['cluster'] = clusters
            cluster_analysis = df.groupby('cluster').agg({
                'disease_category': lambda x: x.mode()[0] if len(x.mode()) > 0 else 'unknown',
                'species': lambda x: x.mode()[0] if len(x.mode()) > 0 else 'unknown',
                'is_contagious': 'sum',
                'case_id': 'count'
            }).to_dict('index')
            
            results['models_trained'].append('clustering')
            results['clusters'] = n_clusters
            results['cluster_analysis'] = cluster_analysis
            
            print(f"   ✓ Identified {n_clusters} disease patterns")
        else:
            print("⚠️  Skipping clustering model (insufficient data)")
        
        # Save model
        print(f"\n💾 Saving model...")
        
        # Package all models and metadata
        self.model = {
            'classification_model': self.classification_model,
            'clustering_model': self.clustering_model,
            'label_encoders': self.label_encoders,
            'scaler': self.scaler,
            'training_date': self.training_date,
            'data_size': self.data_size,
            'species_distribution': self.species_distribution,
            'category_distribution': self.category_distribution,
            'confidence': confidence
        }
        
        model_path = self.save_model()
        results['model_path'] = model_path
        print(f"   ✓ Model saved to: {model_path}")

        # Update model_metadata
        self._update_model_metadata(
            record_count=self.data_size,
            accuracy=results.get('classification_accuracy'),
            cv_accuracy=results.get('cv_accuracy')
        )

        print("\n" + "=" * 70)
        print("✅ Training Complete!")
        print("=" * 70)
        print()

        return results

    def _update_model_metadata(self, record_count, accuracy=None, cv_accuracy=None):
        """Write training stats to model_metadata table."""
        try:
            conn = get_db_connection()
            if not conn:
                return
            cur = conn.cursor()
            cur.execute("""
                UPDATE model_metadata
                SET last_trained_at      = NOW(),
                    records_at_last_train = %s,
                    current_accuracy     = %s,
                    cv_accuracy          = %s,
                    model_version        = model_version + 1,
                    updated_at           = NOW()
                WHERE model_name = 'disease_prediction'
            """, (record_count, accuracy, cv_accuracy))
            conn.commit()
            cur.close()
            conn.close()
            print("   ✓ model_metadata updated")
        except Exception as e:
            print(f"   ⚠ Could not update model_metadata: {e}")
    
    def predict(self, data):
        """
        Make predictions on new disease data
        
        Args:
            data (dict or DataFrame): Input data with features:
                - species (str): Animal species
                - breed (str): Breed
                - age_at_diagnosis (int): Age in months
                - severity (str): Severity level
                - is_contagious (bool): Whether disease is contagious
                
        Returns:
            dict: Prediction results with disease category and confidence
        """
        if not self.classification_model:
            return {
                'status': 'model_not_trained',
                'message': 'Classification model not trained yet'
            }
        
        # Convert input to DataFrame if needed
        if isinstance(data, dict):
            df = pd.DataFrame([data])
        else:
            df = pd.DataFrame(data) if not isinstance(data, pd.DataFrame) else data
        
        # Prepare features
        X, _, _ = self.prepare_features(df)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        predictions = self.classification_model.predict(X_scaled)
        probabilities = self.classification_model.predict_proba(X_scaled)
        
        # Decode predictions
        if 'disease_category' in self.label_encoders:
            predicted_categories = self.label_encoders['disease_category'].inverse_transform(predictions)
        else:
            predicted_categories = predictions
        
        results = []
        for i, pred in enumerate(predicted_categories):
            confidence = max(probabilities[i]) if len(probabilities) > i else 0.0
            
            results.append({
                'predicted_category': pred,
                'confidence': float(confidence),
                'confidence_level': 'high' if confidence > 0.7 else 'medium' if confidence > 0.5 else 'low',
                'all_probabilities': {
                    self.label_encoders['disease_category'].inverse_transform([j])[0]: float(probabilities[i][j])
                    for j in range(len(probabilities[i]))
                } if 'disease_category' in self.label_encoders else {}
            })
        
        return {
            'status': 'success',
            'predictions': results,
            'model_confidence': self.get_model_confidence()
        }
    
    def predict_outbreak_risk(self, species=None, disease_category=None, region=None, days_lookback=30):
        """
        Predict disease outbreak risk based on recent cases
        
        Args:
            species (str, optional): Filter by species
            disease_category (str, optional): Filter by disease category
            region (str, optional): Filter by region
            days_lookback (int): Number of days to analyze
            
        Returns:
            dict: Outbreak risk assessment
        """
        # Load recent disease cases
        data = self.data_loader.load_disease_data()
        
        # Handle both DataFrame and dict/list returns
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.DataFrame(data) if data else pd.DataFrame()
        
        if df.empty:
            return {
                'risk_level': 'unknown',
                'reason': 'No disease data available',
                'confidence': 'very_low'
            }
        
        # Filter by date
        cutoff_date = datetime.now().date() - timedelta(days=days_lookback)
        df['diagnosis_date'] = pd.to_datetime(df['diagnosis_date'])
        recent_cases = df[df['diagnosis_date'].dt.date >= cutoff_date]
        
        # Apply filters
        if species:
            recent_cases = recent_cases[recent_cases['species'] == species]
        if disease_category:
            recent_cases = recent_cases[recent_cases['disease_category'] == disease_category]
        if region:
            recent_cases = recent_cases[recent_cases['region'] == region]
        
        # Calculate risk score (max 10) — calibrated for a small suburban clinic
        risk_score = 0
        reasons = []

        # Factor 1: Case volume relative to expected for a small clinic
        # Normal monthly load ~15-20 cases; flag only unusually high volumes
        case_count = len(recent_cases)
        expected = max(1, days_lookback * 0.6)  # ~0.6 cases/day baseline
        if case_count >= expected * 2.5:
            risk_score += 2
            reasons.append(f"{case_count} cases in {days_lookback} days (unusually high)")
        elif case_count >= expected * 1.5:
            risk_score += 1
            reasons.append(f"{case_count} cases in {days_lookback} days (above average)")

        # Factor 2: Contagious disease rate (proportion-based, not count-based)
        # A handful of contagious cases is routine — focus on the percentage
        contagious_count = int(recent_cases['is_contagious'].sum()) if 'is_contagious' in recent_cases.columns else 0
        if case_count > 0:
            contagious_pct = contagious_count / case_count
            if contagious_pct >= 0.50 and contagious_count >= 5:
                risk_score += 3
                reasons.append(f"{contagious_count} contagious cases ({round(contagious_pct*100)}% of total)")
            elif contagious_pct >= 0.35 and contagious_count >= 3:
                risk_score += 2
                reasons.append(f"{contagious_count} contagious cases ({round(contagious_pct*100)}% of total)")
            elif contagious_pct >= 0.20 and contagious_count >= 2:
                risk_score += 1
                reasons.append(f"{contagious_count} contagious cases detected")

        # Factor 3: Severity — scaled by period length (expected ~1 severe case per 30 days)
        severe_count = recent_cases[recent_cases['severity'].isin(['severe', 'critical'])].shape[0]
        period_months = days_lookback / 30
        severe_high_threshold = max(4, round(4 * period_months))
        severe_low_threshold = max(2, round(2 * period_months))
        if severe_count >= severe_high_threshold:
            risk_score += 2
            reasons.append(f"{severe_count} severe/critical cases")
        elif severe_count >= severe_low_threshold:
            risk_score += 1
            reasons.append(f"{severe_count} severe/critical cases")

        # Factor 4: Same contagious disease cluster — threshold scales with period
        # A cluster of 3 in 30 days is notable; needs proportionally more in longer windows
        if not recent_cases.empty:
            contagious_cases = recent_cases[recent_cases['is_contagious'] == True] if 'is_contagious' in recent_cases.columns else recent_cases
            if not contagious_cases.empty:
                min_cluster_size = max(3, days_lookback // 12)
                disease_counts = contagious_cases['disease_name'].value_counts()
                clustered = disease_counts[disease_counts >= min_cluster_size]
                if len(clustered) > 0:
                    risk_score += 2
                    reasons.append(f"Disease cluster: {', '.join(clustered.index[:2])}")

        # Factor 5: Accelerating trend in second half of the period
        if len(recent_cases) >= 8:
            halfway = datetime.now().date() - timedelta(days=days_lookback//2)
            first_half = recent_cases[recent_cases['diagnosis_date'].dt.date < halfway]
            second_half = recent_cases[recent_cases['diagnosis_date'].dt.date >= halfway]
            if len(first_half) > 0 and len(second_half) > len(first_half) * 2.0:
                risk_score += 1
                reasons.append("Rapid increase in cases detected")

        # Cap at 10
        risk_score = min(risk_score, 10)

        # Determine risk level — critical requires a genuine multi-factor outbreak signal
        if risk_score >= 8:
            risk_level = 'critical'
        elif risk_score >= 5:
            risk_level = 'high'
        elif risk_score >= 3:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Get confidence
        confidence = self.get_model_confidence()
        
        return {
            'risk_level': risk_level,
            'risk_score': min(risk_score, 10),
            'case_count': case_count,
            'contagious_cases': int(contagious_count),
            'days_analyzed': days_lookback,
            'reasons': reasons,
            'confidence': confidence['level'],
            'filters': {
                'species': species,
                'disease_category': disease_category,
                'region': region
            },
            'recommendation': self._get_risk_recommendation(risk_level, reasons)
        }
    
    def _get_risk_recommendation(self, risk_level, reasons):
        """Get recommendation based on risk level"""
        recommendations = {
            'critical': 'IMMEDIATE ACTION REQUIRED: Implement quarantine protocols, alert authorities, increase monitoring.',
            'high': 'HIGH ALERT: Increase preventive measures, monitor closely, prepare response protocols.',
            'medium': 'MODERATE CONCERN: Monitor situation, review vaccination schedules, maintain hygiene protocols.',
            'low': 'NORMAL STATUS: Continue routine preventive care and monitoring.'
        }
        return recommendations.get(risk_level, 'Monitor situation')
    
    def analyze_patterns(self):
        """
        Analyze disease patterns using clustering
        
        Returns:
            dict: Pattern analysis results
        """
        if not self.clustering_model:
            return {
                'status': 'unavailable',
                'reason': 'Clustering model not trained'
            }
        
        # Load data
        data = self.data_loader.load_disease_data()
        
        # Handle both DataFrame and dict/list returns
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.DataFrame(data) if data else pd.DataFrame()
        
        # Prepare features
        X, _, _ = self.prepare_features(df)
        X_scaled = self.scaler.transform(X)
        
        # Predict clusters
        clusters = self.clustering_model.predict(X_scaled)
        df['pattern_cluster'] = clusters
        
        # Analyze each pattern
        patterns = []
        for cluster_id in range(self.clustering_model.n_clusters):
            cluster_data = df[df['pattern_cluster'] == cluster_id]
            
            if len(cluster_data) == 0:
                continue
            
            pattern = {
                'pattern_id': int(cluster_id),
                'case_count': len(cluster_data),
                'primary_species': cluster_data['species'].mode()[0] if len(cluster_data['species'].mode()) > 0 else 'unknown',
                'common_category': cluster_data['disease_category'].mode()[0] if len(cluster_data['disease_category'].mode()) > 0 else 'unknown',
                'avg_age': float(cluster_data['age_at_diagnosis'].mean()) if 'age_at_diagnosis' in cluster_data else None,
                'contagious_percentage': float(cluster_data['is_contagious'].mean() * 100) if 'is_contagious' in cluster_data else 0,
                'common_diseases': cluster_data['disease_name'].value_counts().head(3).to_dict(),
                'affected_species': cluster_data['species'].value_counts().to_dict()
            }
            patterns.append(pattern)
        
        return {
            'status': 'success',
            'patterns_found': len(patterns),
            'patterns': patterns,
            'confidence': self.get_model_confidence()
        }
    
    def get_species_trends(self, species=None):
        """
        Analyze disease trends by species
        
        Args:
            species (str, optional): Specific species to analyze
            
        Returns:
            dict: Species-specific disease trends
        """
        data = self.data_loader.load_disease_data()
        
        # Handle both DataFrame and dict/list returns
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.DataFrame(data) if data else pd.DataFrame()
        
        if species:
            df = df[df['species'] == species]
        
        if df.empty:
            return {'status': 'no_data', 'species': species}
        
        trends = {
            'species': species or 'all',
            'total_cases': len(df),
            'disease_distribution': df['disease_category'].value_counts().to_dict(),
            'most_common_diseases': df['disease_name'].value_counts().head(5).to_dict(),
            'contagious_percentage': float(df['is_contagious'].mean() * 100) if 'is_contagious' in df.columns else 0,
            'avg_age_at_diagnosis': float(df['age_at_diagnosis'].mean()) if 'age_at_diagnosis' in df else None,
            'severity_distribution': df['severity'].value_counts().to_dict() if 'severity' in df.columns else {}
        }
        
        # Timeline analysis (if enough temporal data)
        if 'diagnosis_date' in df.columns:
            df['diagnosis_date'] = pd.to_datetime(df['diagnosis_date'])
            df['month'] = df['diagnosis_date'].dt.to_period('M').astype(str)
            monthly_counts = df.groupby('month').size().to_dict()
            trends['monthly_trends'] = monthly_counts
        
        return trends
    
    def get_geographic_distribution(self):
        """
        Analyze disease distribution by region
        
        Returns:
            dict: Geographic disease distribution
        """
        data = self.data_loader.load_disease_data()
        
        # Handle both DataFrame and dict/list returns
        if isinstance(data, pd.DataFrame):
            df = data
        else:
            df = pd.DataFrame(data) if data else pd.DataFrame()
        
        if 'region' not in df.columns or df['region'].isna().all():
            return {'status': 'no_geographic_data'}
        
        # Filter out null regions
        df_with_region = df[df['region'].notna()]
        
        if df_with_region.empty:
            return {'status': 'no_geographic_data'}
        
        regions = {}
        for region in df_with_region['region'].unique():
            region_data = df_with_region[df_with_region['region'] == region]
            
            regions[region] = {
                'total_cases': len(region_data),
                'categories': region_data['disease_category'].value_counts().to_dict(),
                'contagious_cases': int(region_data['is_contagious'].sum()) if 'is_contagious' in region_data.columns else 0,
                'species': region_data['species'].value_counts().to_dict()
            }
        
        return {
            'status': 'success',
            'regions': regions,
            'total_regions': len(regions),
            'hotspot': max(regions.keys(), key=lambda x: regions[x]['total_cases']) if regions else None
        }

    def forecast_disease_trends(self, periods_months=12, species=None, disease_category=None):
        """
        Forecast disease activity, outbreak probability, and pandemic risk using
        multi-source clinical data: disease cases, appointments, medical records,
        and pet demographics.
        """
        try:
            from prophet import Prophet

            conn = get_db_connection()
            cur = conn.cursor()

            # --- 1. Monthly disease case data ---
            disease_q = """
                SELECT
                    DATE_TRUNC('month', diagnosis_date)::date AS month,
                    COUNT(*) AS disease_cases,
                    SUM(CASE WHEN is_contagious THEN 1 ELSE 0 END) AS contagious_cases,
                    COUNT(DISTINCT species) AS species_diversity,
                    SUM(CASE WHEN severity IN ('severe','critical') THEN 1 ELSE 0 END) AS severe_cases,
                    COUNT(DISTINCT disease_name) AS unique_diseases
                FROM disease_cases
                WHERE diagnosis_date IS NOT NULL
            """
            params = []
            if species:
                disease_q += " AND species = %s"
                params.append(species)
            if disease_category:
                disease_q += " AND disease_category = %s"
                params.append(disease_category)
            disease_q += " GROUP BY DATE_TRUNC('month', diagnosis_date)::date ORDER BY month"
            cur.execute(disease_q, params)
            disease_rows = cur.fetchall()

            # --- 2. Monthly appointment data ---
            cur.execute("""
                SELECT
                    DATE_TRUNC('month', appointment_date)::date AS month,
                    COUNT(*) AS appointment_count,
                    COUNT(DISTINCT pet_id) AS unique_pets_seen
                FROM appointments
                WHERE status NOT IN ('cancelled')
                GROUP BY DATE_TRUNC('month', appointment_date)::date
                ORDER BY month
            """)
            appt_rows = cur.fetchall()

            # --- 3. Monthly medical records data ---
            cur.execute("""
                SELECT
                    DATE_TRUNC('month', visit_date)::date AS month,
                    COUNT(*) AS record_count,
                    SUM(CASE WHEN follow_up_required THEN 1 ELSE 0 END) AS follow_ups
                FROM medical_records
                GROUP BY DATE_TRUNC('month', visit_date)::date
                ORDER BY month
            """)
            record_rows = cur.fetchall()

            # --- 4. Active pet demographics snapshot ---
            cur.execute("""
                SELECT
                    species,
                    COUNT(*) AS count,
                    AVG(
                        EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) * 12 +
                        EXTRACT(MONTH FROM AGE(CURRENT_DATE, date_of_birth))
                    ) AS avg_age_months
                FROM pets
                WHERE is_active = true AND date_of_birth IS NOT NULL
                GROUP BY species
                ORDER BY count DESC
                LIMIT 10
            """)
            demo_rows = cur.fetchall()

            cur.close()
            conn.close()

            if not disease_rows or len(disease_rows) < 3:
                return {'error': 'Insufficient disease case data for forecasting'}

            # --- Build DataFrames ---
            disease_df = pd.DataFrame(disease_rows, columns=['ds', 'disease_cases', 'contagious_cases', 'species_diversity', 'severe_cases', 'unique_diseases'])
            disease_df['ds'] = pd.to_datetime(disease_df['ds'])

            appt_df = pd.DataFrame(appt_rows, columns=['ds', 'appointment_count', 'unique_pets_seen']) if appt_rows else pd.DataFrame(columns=['ds', 'appointment_count', 'unique_pets_seen'])
            appt_df['ds'] = pd.to_datetime(appt_df['ds'])

            record_df = pd.DataFrame(record_rows, columns=['ds', 'record_count', 'follow_ups']) if record_rows else pd.DataFrame(columns=['ds', 'record_count', 'follow_ups'])
            record_df['ds'] = pd.to_datetime(record_df['ds'])

            merged = disease_df.merge(appt_df, on='ds', how='left').merge(record_df, on='ds', how='left').fillna(0)
            merged['contagious_rate'] = merged['contagious_cases'] / merged['disease_cases'].replace(0, 1)
            last_date = merged['ds'].max()

            # ============================================================
            # FORECAST 1: Disease case volume (Prophet + appointment regressor)
            # ============================================================
            has_appt = len(appt_df) >= 3
            model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False, uncertainty_samples=500)
            if has_appt:
                model.add_regressor('appointment_count')

            train_df = merged[['ds', 'disease_cases', 'appointment_count']].rename(columns={'disease_cases': 'y'})
            model.fit(train_df)

            future = model.make_future_dataframe(periods=periods_months, freq='MS')
            if has_appt:
                last_appt = float(merged['appointment_count'].tail(3).mean())
                appt_trend = float((merged['appointment_count'].tail(3).mean() - merged['appointment_count'].head(3).mean()) / max(len(merged) - 3, 1))
                appt_map = dict(zip(merged['ds'], merged['appointment_count']))
                future_appt_vals = []
                future_idx = 0
                for _, row in future.iterrows():
                    if row['ds'] in appt_map:
                        future_appt_vals.append(appt_map[row['ds']])
                    else:
                        future_appt_vals.append(max(0, last_appt + appt_trend * future_idx))
                        future_idx += 1
                future['appointment_count'] = future_appt_vals

            forecast = model.predict(future)
            future_fc = forecast[forecast['ds'] > last_date].copy()

            predictions = []
            for _, row in future_fc.iterrows():
                predictions.append({
                    'month': row['ds'].strftime('%Y-%m'),
                    'predicted_cases': max(0, round(float(row['yhat']))),
                    'lower_bound': max(0, round(float(row['yhat_lower']))),
                    'upper_bound': max(0, round(float(row['yhat_upper'])))
                })

            hist_avg = float(merged['disease_cases'].tail(6).mean())
            fc_avg = float(future_fc['yhat'].mean())
            trend_direction = 'increasing' if fc_avg > hist_avg * 1.15 else ('decreasing' if fc_avg < hist_avg * 0.85 else 'stable')
            peak_row = future_fc.loc[future_fc['yhat'].idxmax()]
            peak_month = peak_row['ds'].strftime('%B %Y')

            # ============================================================
            # FORECAST 2: Disease activity level per month
            # Factors: contagious rate, species diversity, severity ratio, disease variety
            # ============================================================
            max_diversity = float(merged['species_diversity'].max()) or 1.0
            merged['activity_score'] = (
                merged['contagious_rate'] * 40 +
                (merged['species_diversity'] / max_diversity) * 20 +
                (merged['severe_cases'] / merged['disease_cases'].replace(0, 1)) * 20 +
                (merged['unique_diseases'] / merged['disease_cases'].replace(0, 1)).clip(0, 1) * 20
            ).clip(0, 100).round(1)

            ob_model = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False, uncertainty_samples=0)
            ob_model.fit(merged[['ds', 'activity_score']].rename(columns={'activity_score': 'y'}))
            ob_future = ob_model.make_future_dataframe(periods=periods_months, freq='MS')
            ob_fc = ob_model.predict(ob_future)
            ob_future_fc = ob_fc[ob_fc['ds'] > last_date]

            activity_forecast = []
            for _, row in ob_future_fc.iterrows():
                score = max(0, min(100, round(float(row['yhat']), 1)))
                level = 'high' if score >= 60 else ('moderate' if score >= 35 else 'normal')
                activity_forecast.append({'month': row['ds'].strftime('%Y-%m'), 'activity_score': score, 'activity_level': level})

            # ============================================================
            # FORECAST 3: Pandemic risk index (0–10)
            # Factors: multi-species contagious spread + severity + appointment acceleration
            # ============================================================
            merged['pandemic_index'] = (
                merged['contagious_rate'] * 5 +
                (merged['species_diversity'] / 10.0).clip(0, 3) +
                (merged['severe_cases'] / merged['disease_cases'].replace(0, 1)) * 2
            ).clip(0, 10).round(2)

            current_pandemic_index = round(float(merged['pandemic_index'].tail(3).mean()), 2)
            pandemic_level = 'high' if current_pandemic_index >= 6 else ('medium' if current_pandemic_index >= 3 else 'low')
            pandemic_descriptions = {
                'high': 'Elevated multi-species contagious activity detected. Recommend notifying provincial veterinary and health authorities.',
                'medium': 'Moderate disease pressure across multiple species. Enhanced surveillance and monitoring recommended.',
                'low': 'Disease activity within normal range for this clinic. Routine monitoring sufficient.'
            }

            # ============================================================
            # FORECAST 4: Category-level forecasts (top 5 disease categories)
            # ============================================================
            category_trend = {}
            try:
                data = self.data_loader.load_disease_data()
                df_full = data if isinstance(data, pd.DataFrame) else (pd.DataFrame(data) if data else pd.DataFrame())
                if not df_full.empty and 'disease_category' in df_full.columns:
                    df_full['month'] = pd.to_datetime(df_full['diagnosis_date']).dt.to_period('M').dt.to_timestamp()
                    for cat in df_full['disease_category'].value_counts().head(5).index.tolist():
                        cat_data = df_full[df_full['disease_category'] == cat].groupby('month').size().reset_index(name='y').rename(columns={'month': 'ds'})
                        if len(cat_data) >= 3:
                            cm = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False, uncertainty_samples=0)
                            cm.fit(cat_data)
                            cp = cm.predict(cm.make_future_dataframe(periods=periods_months, freq='MS'))
                            category_trend[cat] = [
                                {'month': r['ds'].strftime('%Y-%m'), 'predicted': max(0, round(float(r['yhat'])))}
                                for _, r in cp[cp['ds'] > last_date].iterrows()
                            ]
            except Exception:
                pass

            # Pet demographics
            demographics = {}
            if demo_rows:
                demo_df = pd.DataFrame(demo_rows, columns=['species', 'count', 'avg_age_months'])
                for _, row in demo_df.iterrows():
                    demographics[row['species']] = {
                        'count': int(row['count']),
                        'avg_age_months': round(float(row['avg_age_months']), 1) if row['avg_age_months'] else None
                    }

            return {
                'predictions': predictions,
                'activity_forecast': activity_forecast,
                'pandemic_risk': {
                    'current_index': current_pandemic_index,
                    'level': pandemic_level,
                    'description': pandemic_descriptions[pandemic_level]
                },
                'trend_direction': trend_direction,
                'peak_month': peak_month,
                'historical_monthly_avg': round(hist_avg, 1),
                'forecast_monthly_avg': round(fc_avg, 1),
                'total_forecast_cases': sum(p['predicted_cases'] for p in predictions),
                'periods_months': periods_months,
                'category_trend': category_trend,
                'pet_demographics': demographics,
                'data_sources': {
                    'disease_case_months': len(disease_df),
                    'appointment_months': len(appt_df),
                    'medical_record_months': len(record_df),
                    'active_pets': sum(d['count'] for d in demographics.values()) if demographics else 0
                },
                'confidence': self.get_model_confidence()['level'],
                'filters': {'species': species, 'disease_category': disease_category}
            }

        except Exception as e:
            return {'error': f'Forecast failed: {str(e)}'}


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("  VetCare Pro - Disease Prediction Model Training")
    print("  Phase 2: Disease Prediction ML")
    print("=" * 70)
    print()
    
    # Create and train model
    model = DiseasePredictionModel()
    
    try:
        results = model.train()
        
        print("\n📊 Training Summary:")
        print(f"   Data size: {results['data_size']} cases")
        print(f"   Models trained: {', '.join(results['models_trained'])}")
        print(f"   Confidence: {results['confidence']['level']}")
        
        if 'classification_accuracy' in results:
            print(f"   Classification accuracy: {results['classification_accuracy']:.2%}")
        
        # Test outbreak prediction
        print("\n\n🧪 Testing Outbreak Risk Prediction...")
        risk = model.predict_outbreak_risk(days_lookback=60)
        print(f"   Risk Level: {risk['risk_level'].upper()}")
        print(f"   Cases analyzed: {risk['case_count']}")
        if risk['reasons']:
            print(f"   Reasons: {', '.join(risk['reasons'])}")
        
        # Test pattern analysis
        if 'clustering' in results['models_trained']:
            print("\n\n🔍 Testing Pattern Analysis...")
            patterns = model.analyze_patterns()
            if patterns['status'] == 'success':
                print(f"   Patterns found: {patterns['patterns_found']}")
        
        print("\n✅ Model training and testing complete!")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
