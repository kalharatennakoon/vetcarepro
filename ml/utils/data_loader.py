"""
Data Loader Utility for ML Models
Extracts and prepares data from PostgreSQL database
"""

import pandas as pd
from datetime import datetime, timedelta
from config.db_connection import get_db_connection


class DataLoader:
    """Loads and prepares data for ML models"""
    
    def __init__(self):
        self.db = get_db_connection()
    
    def load_sales_data(self, start_date=None, end_date=None):
        """
        Load sales/billing data for forecasting
        
        Args:
            start_date (str): Start date for data extraction (YYYY-MM-DD)
            end_date (str): End date for data extraction (YYYY-MM-DD)
            
        Returns:
            pd.DataFrame: Sales data with date, amount, and related fields
        """
        query = """
            SELECT 
                b.bill_date::date as date,
                COUNT(b.bill_id) as transaction_count,
                SUM(b.total_amount) as total_revenue,
                SUM(b.tax_amount) as total_tax,
                AVG(b.total_amount) as avg_transaction,
                STRING_AGG(DISTINCT b.payment_method, ',') as payment_methods
            FROM billing b
            WHERE b.payment_status = 'paid'
        """
        
        params = []
        if start_date:
            query += " AND b.bill_date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND b.bill_date <= %s"
            params.append(end_date)
        
        query += " GROUP BY b.bill_date::date ORDER BY date"
        
        with self.db as db:
            results = db.execute_query(query, tuple(params) if params else None)
            return pd.DataFrame(results)
    
    def load_inventory_data(self):
        """
        Load inventory transaction data for demand forecasting
        
        Returns:
            pd.DataFrame: Inventory usage data
        """
        query = """
            SELECT 
                bi.item_id,
                i.item_name,
                i.category,
                b.bill_date::date as date,
                SUM(bi.quantity) as quantity_used,
                SUM(bi.unit_price * bi.quantity) as revenue
            FROM billing_items bi
            JOIN billing b ON bi.bill_id = b.bill_id
            JOIN inventory i ON bi.item_id = i.item_id
            WHERE b.payment_status = 'paid'
            GROUP BY bi.item_id, i.item_name, i.category, b.bill_date::date
            ORDER BY date, bi.item_id
        """
        
        with self.db as db:
            results = db.execute_query(query)
            return pd.DataFrame(results)
    
    def load_disease_data(self, start_date=None, end_date=None):
        """
        Load disease case data for outbreak prediction
        
        Args:
            start_date (str): Start date for data extraction
            end_date (str): End date for data extraction
            
        Returns:
            pd.DataFrame: Disease case records
        """
        query = """
            SELECT 
                dc.case_id,
                dc.pet_id,
                p.species,
                p.breed,
                p.age_years,
                dc.disease_name,
                dc.disease_category,
                dc.severity,
                dc.is_contagious,
                dc.transmission_method,
                dc.outcome,
                dc.diagnosis_date,
                c.city
            FROM disease_cases dc
            JOIN pets p ON dc.pet_id = p.pet_id
            JOIN customers c ON p.customer_id = c.customer_id
            WHERE 1=1
        """
        
        params = []
        if start_date:
            query += " AND dc.diagnosis_date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND dc.diagnosis_date <= %s"
            params.append(end_date)
        
        query += " ORDER BY dc.diagnosis_date"
        
        with self.db as db:
            results = db.execute_query(query, tuple(params) if params else None)
            return pd.DataFrame(results)
    
    def load_medical_records(self, start_date=None, end_date=None):
        """
        Load medical records for analysis
        
        Args:
            start_date (str): Start date
            end_date (str): End date
            
        Returns:
            pd.DataFrame: Medical records
        """
        query = """
            SELECT 
                mr.record_id,
                mr.pet_id,
                p.species,
                p.breed,
                mr.visit_date,
                mr.chief_complaint,
                mr.diagnosis,
                mr.treatment,
                mr.prescription,
                mr.weight,
                mr.temperature,
                c.city
            FROM medical_records mr
            JOIN pets p ON mr.pet_id = p.pet_id
            JOIN customers c ON p.customer_id = c.customer_id
            WHERE 1=1
        """
        
        params = []
        if start_date:
            query += " AND mr.visit_date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND mr.visit_date <= %s"
            params.append(end_date)
        
        query += " ORDER BY mr.visit_date"
        
        with self.db as db:
            results = db.execute_query(query, tuple(params) if params else None)
            return pd.DataFrame(results)
    
    def load_appointment_data(self, start_date=None, end_date=None):
        """
        Load appointment data for analysis
        
        Returns:
            pd.DataFrame: Appointment records
        """
        query = """
            SELECT 
                a.appointment_id,
                a.appointment_date,
                a.appointment_type,
                a.status,
                a.duration_minutes,
                a.estimated_cost,
                p.species,
                p.breed
            FROM appointments a
            JOIN pets p ON a.pet_id = p.pet_id
            WHERE 1=1
        """
        
        params = []
        if start_date:
            query += " AND a.appointment_date >= %s"
            params.append(start_date)
        if end_date:
            query += " AND a.appointment_date <= %s"
            params.append(end_date)
        
        query += " ORDER BY a.appointment_date"
        
        with self.db as db:
            results = db.execute_query(query, tuple(params) if params else None)
            return pd.DataFrame(results)
    
    def get_inventory_current_stock(self):
        """
        Get current inventory stock levels
        
        Returns:
            pd.DataFrame: Current inventory status
        """
        query = """
            SELECT 
                item_id,
                item_name,
                category,
                quantity,
                reorder_level,
                unit_cost,
                selling_price,
                expiry_date
            FROM inventory
            ORDER BY item_name
        """
        
        with self.db as db:
            results = db.execute_query(query)
            return pd.DataFrame(results)
