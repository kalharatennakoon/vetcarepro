"""
Test script to verify ML infrastructure setup
Run this to test database connection and data loading
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.db_connection import get_db_connection
from utils.data_loader import DataLoader


def test_database_connection():
    """Test database connection"""
    print("Testing database connection...")
    try:
        db = get_db_connection()
        with db as connection:
            result = connection.execute_query("SELECT NOW() as current_time")
            print(f"✓ Database connection successful!")
            print(f"  Server time: {result[0]['current_time']}")
            return True
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        return False


def test_data_loading():
    """Test data loading functionality"""
    print("\nTesting data loading...")
    try:
        loader = DataLoader()
        
        # Test sales data loading
        print("  Loading sales data...")
        sales_df = loader.load_sales_data()
        print(f"  ✓ Loaded {len(sales_df)} sales records")
        
        # Test inventory data loading
        print("  Loading inventory data...")
        inventory_df = loader.load_inventory_data()
        print(f"  ✓ Loaded {len(inventory_df)} inventory transaction records")
        
        # Test medical records loading
        print("  Loading medical records...")
        medical_df = loader.load_medical_records()
        print(f"  ✓ Loaded {len(medical_df)} medical records")
        
        # Test appointment data loading
        print("  Loading appointment data...")
        appointment_df = loader.load_appointment_data()
        print(f"  ✓ Loaded {len(appointment_df)} appointments")
        
        # Test current inventory
        print("  Loading current inventory...")
        current_inv_df = loader.get_inventory_current_stock()
        print(f"  ✓ Loaded {len(current_inv_df)} inventory items")
        
        return True
    except Exception as e:
        print(f"  ✗ Data loading failed: {e}")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("VetCare Pro ML Infrastructure Test")
    print("=" * 60)
    
    # Test database connection
    db_test = test_database_connection()
    
    # Test data loading
    data_test = test_data_loading()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    print(f"Database Connection: {'✓ PASS' if db_test else '✗ FAIL'}")
    print(f"Data Loading:        {'✓ PASS' if data_test else '✗ FAIL'}")
    
    if db_test and data_test:
        print("\n🎉 All tests passed! ML infrastructure is ready.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
