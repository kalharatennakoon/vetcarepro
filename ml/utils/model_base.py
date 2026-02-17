"""
Base Model Class for ML Models
Provides common functionality for all ML models
"""

import os
import joblib
from datetime import datetime
from abc import ABC, abstractmethod


class BaseMLModel(ABC):
    """Abstract base class for all ML models"""
    
    def __init__(self, model_name):
        """
        Initialize base model
        
        Args:
            model_name (str): Name of the model for saving/loading
        """
        self.model_name = model_name
        self.model = None
        self.trained_date = None
        self.model_path = os.getenv('MODEL_PATH', './models')
        
        # Create model directory if it doesn't exist
        os.makedirs(self.model_path, exist_ok=True)
    
    @abstractmethod
    def train(self, data):
        """
        Train the model with provided data
        
        Args:
            data: Training data (format depends on specific model)
        """
        pass
    
    @abstractmethod
    def predict(self, data):
        """
        Make predictions using the trained model
        
        Args:
            data: Input data for prediction
            
        Returns:
            Predictions
        """
        pass
    
    def save_model(self):
        """Save the trained model to disk"""
        if self.model is None:
            raise ValueError("No model to save. Train the model first.")
        
        model_file = os.path.join(
            self.model_path, 
            f"{self.model_name}_{datetime.now().strftime('%Y%m%d')}.pkl"
        )
        
        model_data = {
            'model': self.model,
            'trained_date': datetime.now(),
            'model_name': self.model_name
        }
        
        joblib.dump(model_data, model_file)
        print(f"Model saved to {model_file}")
        return model_file
    
    def load_model(self, model_file=None):
        """
        Load a trained model from disk
        
        Args:
            model_file (str): Path to model file. If None, loads the latest model.
        """
        if model_file is None:
            # Find the latest model file
            model_files = [
                f for f in os.listdir(self.model_path) 
                if f.startswith(self.model_name) and f.endswith('.pkl')
            ]
            
            if not model_files:
                raise FileNotFoundError(f"No saved models found for {self.model_name}")
            
            model_files.sort(reverse=True)
            model_file = os.path.join(self.model_path, model_files[0])
        
        model_data = joblib.load(model_file)
        self.model = model_data['model']
        self.trained_date = model_data['trained_date']
        
        print(f"Model loaded from {model_file}")
        print(f"Model trained on: {self.trained_date}")
        
        return self.model
    
    def get_model_info(self):
        """Get information about the current model"""
        return {
            'model_name': self.model_name,
            'trained_date': self.trained_date.isoformat() if self.trained_date else None,
            'is_trained': self.model is not None
        }
