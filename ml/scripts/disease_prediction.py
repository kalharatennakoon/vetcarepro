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
from sklearn.naive_bayes import GaussianNB, MultinomialNB
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, silhouette_score

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from utils.model_base import BaseMLModel
from utils.data_loader import DataLoader

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
            print("🤖 Training Classification Model (Naive Bayes)...")
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Split data (80-20)
            X_train, X_test, y_train, y_test = train_test_split(
                X_scaled, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
            )
            
            # Train Naive Bayes (works well with small datasets)
            self.classification_model = GaussianNB()
            self.classification_model.fit(X_train, y_train)
            
            # Evaluate
            y_pred = self.classification_model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
            
            print(f"   ✓ Training accuracy: {accuracy:.2%}")
            results['models_trained'].append('classification')
            results['classification_accuracy'] = accuracy
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
        
        print("\n" + "=" * 70)
        print("✅ Training Complete!")
        print("=" * 70)
        print()
        
        return results
    
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
        
        # Calculate risk score
        risk_score = 0
        reasons = []
        
        # Factor 1: Number of cases
        case_count = len(recent_cases)
        if case_count >= 10:
            risk_score += 3
            reasons.append(f"{case_count} cases in {days_lookback} days")
        elif case_count >= 5:
            risk_score += 2
            reasons.append(f"{case_count} cases in {days_lookback} days")
        elif case_count >= 3:
            risk_score += 1
            reasons.append(f"{case_count} cases detected")
        
        # Factor 2: Contagious diseases
        contagious_count = recent_cases['is_contagious'].sum() if 'is_contagious' in recent_cases.columns else 0
        if contagious_count > 0:
            risk_score += int(contagious_count * 1.5)
            reasons.append(f"{contagious_count} contagious cases")
        
        # Factor 3: Severity
        severe_count = recent_cases[recent_cases['severity'].isin(['severe', 'critical'])].shape[0]
        if severe_count >= 3:
            risk_score += 2
            reasons.append(f"{severe_count} severe/critical cases")
        elif severe_count > 0:
            risk_score += 1
        
        # Factor 4: Same disease occurring multiple times
        if not recent_cases.empty:
            disease_counts = recent_cases['disease_name'].value_counts()
            repeated_diseases = disease_counts[disease_counts >= 3]
            if len(repeated_diseases) > 0:
                risk_score += 2
                reasons.append(f"Repeated occurrences: {', '.join(repeated_diseases.index[:2])}")
        
        # Factor 5: Trend (increasing cases)
        if len(recent_cases) >= 6:
            halfway = datetime.now().date() - timedelta(days=days_lookback//2)
            first_half = recent_cases[recent_cases['diagnosis_date'].dt.date < halfway]
            second_half = recent_cases[recent_cases['diagnosis_date'].dt.date >= halfway]
            
            if len(second_half) > len(first_half) * 1.5:
                risk_score += 2
                reasons.append(f"Increasing trend detected")
        
        # Determine risk level
        if risk_score >= 10:
            risk_level = 'critical'
        elif risk_score >= 7:
            risk_level = 'high'
        elif risk_score >= 4:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        # Get confidence
        confidence = self.get_model_confidence()
        
        return {
            'risk_level': risk_level,
            'risk_score': risk_score,
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
