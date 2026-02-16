"""
Database Connection Utility for ML Services
Handles PostgreSQL connections for data extraction and model training
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DatabaseConnection:
    """Manages database connections for ML data operations"""
    
    def __init__(self):
        self.connection_params = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'vetcarepro'),
            'user': os.getenv('DB_USER', 'postgres')
        }
        
        # Only include password if it's explicitly set
        password = os.getenv('DB_PASSWORD', '')
        if password:
            self.connection_params['password'] = password
            
        self.connection = None
    
    def connect(self):
        """Establish database connection"""
        try:
            self.connection = psycopg2.connect(**self.connection_params)
            return self.connection
        except Exception as e:
            print(f"Error connecting to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
    
    def execute_query(self, query, params=None, fetch=True):
        """
        Execute a SQL query and return results
        
        Args:
            query (str): SQL query to execute
            params (tuple): Query parameters
            fetch (bool): Whether to fetch results
            
        Returns:
            list: Query results as list of dictionaries
        """
        try:
            if not self.connection:
                self.connect()
            
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                
                if fetch:
                    results = cursor.fetchall()
                    return [dict(row) for row in results]
                else:
                    self.connection.commit()
                    return None
                    
        except Exception as e:
            print(f"Error executing query: {e}")
            if self.connection:
                self.connection.rollback()
            raise
    
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()


# Convenience function for quick queries
def get_db_connection():
    """Returns a new database connection instance"""
    return DatabaseConnection()
