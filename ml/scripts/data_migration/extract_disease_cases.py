"""
Disease Cases Data Migration Script
Purpose: Extract and classify disease cases from medical records using intelligent analysis
Date: 2026-02-17
Author: VetCare Pro ML Team
Phase: Disease Prediction ML - Phase 2
"""

import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from config.db_connection import DatabaseConnection

class DiseaseCaseMigration:
    """
    Migrates disease data from medical_records to disease_cases table
    with intelligent classification and validation
    """
    
    # Disease keywords for classification
    DISEASE_CATEGORIES = {
        'infectious': [
            'infection', 'viral', 'bacterial', 'fungal', 'sepsis',
            'pneumonia', 'parvovirus', 'distemper', 'kennel cough',
            'canine influenza', 'feline leukemia', 'fiv', 'rabies',
            'leptospirosis', 'bordetella', 'coronavirus'
        ],
        'parasitic': [
            'parasite',  'worm', 'flea', 'tick', 'mange', 'heartworm',
            'roundworm', 'hookworm', 'tapeworm', 'giardia', 'coccidia',
            'mite', 'lice', 'demodex', 'sarcoptic'
        ],
        'metabolic': [
            'diabetes', 'thyroid', 'kidney', 'liver', 'metabolic',
            'cushings', 'addison', 'renal', 'hepatic', 'uremia',
            'hypothyroid', 'hyperthyroid', 'pancreatitis'
        ],
        'genetic': [
            'genetic', 'congenital', 'hereditary', 'hip dysplasia',
            'heart defect', 'elbow dysplasia', 'patellar luxation',
            'progressive retinal atrophy', 'von willebrand'
        ],
        'immune_mediated': [
            'allerg', 'immune', 'autoimmune', 'dermatitis',
            'atopic', 'lupus', 'pemphigus', 'thrombocytopenia',
            'anemia', 'inflammatory bowel'
        ],
        'neoplastic': [
            'cancer', 'tumor', 'neoplasm', 'lymphoma', 'carcinoma',
            'sarcoma', 'melanoma', 'mast cell', 'osteosarcoma',
            'mammary tumor', 'leukemia'
        ],
        'traumatic': [
            'fracture', 'wound', 'injury', 'trauma', 'bite',
            'laceration', 'burn', 'poisoning', 'toxicity',
            'hit by car', 'foreign body'
        ],
        'nutritional': [
            'nutrition', 'deficiency', 'malnutrition', 'obesity',
            'vitamin deficiency', 'anorexia', 'cachexia'
        ]
    }
    
    # Contagious disease keywords
    CONTAGIOUS_KEYWORDS = [
        'infection', 'viral', 'bacterial', 'parvovirus', 'distemper',
        'kennel cough', 'contagious', 'influenza', 'coronavirus',
        'ringworm', 'mange', 'feline leukemia', 'fiv'
    ]
    
    # Transmission methods
    TRANSMISSION_TYPES = {
        'airborne': ['airborne', 'respiratory', 'kennel cough', 'influenza', 'pneumonia'],
        'direct_contact': ['contact', 'skin', 'ringworm', 'mange', 'dermatitis'],
        'fecal_oral': ['fecal', 'oral', 'parvovirus', 'coronavirus', 'giardia'],
        'vector_borne': ['vector', 'tick', 'mosquito', 'flea', 'heartworm', 'lyme']
    }
    
    def __init__(self):
        """Initialize database connection"""
        self.db = DatabaseConnection()
        
    def classify_disease(self, diagnosis, symptoms):
        """
        Classify disease into a category based on diagnosis and symptoms
        
        Args:
            diagnosis (str): The diagnosis text
            symptoms (str): The symptoms text
            
        Returns:
            str: Disease category
        """
        if not diagnosis:
            return 'metabolic'  # Default
            
        # Combine diagnosis and symptoms for better classification
        text = (diagnosis + ' ' + (symptoms or '')).lower()
        
        # Check each category
        for category, keywords in self.DISEASE_CATEGORIES.items():
            for keyword in keywords:
                if keyword in text:
                    return category
                    
        return 'metabolic'  # Default category
    
    def determine_severity(self, temperature, heart_rate, resp_rate, symptoms):
        """
        Determine disease severity based on vital signs and symptoms
        
        Args:
            temperature (float): Body temperature in Celsius
            heart_rate (int): Heart rate in bpm
            resp_rate (int): Respiratory rate in breaths per minute
            symptoms (str): Symptom description
            
        Returns:
            str: Severity level
        """
        severity_score = 0
        
        # Temperature assessment (normal dog: 38-39°C, cat: 38-39.2°C)
        if temperature:
            if temperature > 40.5 or temperature < 37.0:
                severity_score += 3
            elif temperature > 39.5 or temperature < 37.5:
                severity_score += 2
            else:
                severity_score += 1
                
        # Heart rate assessment (normal dog: 60-140 bpm, cat: 140-220 bpm)
        if heart_rate:
            if heart_rate > 180 or heart_rate < 60:
                severity_score += 3
            elif heart_rate > 150 or heart_rate < 80:
                severity_score += 2
            else:
                severity_score += 1
                
        # Respiratory rate assessment (normal: 10-30 breaths/min)
        if resp_rate:
            if resp_rate > 40 or resp_rate < 10:
                severity_score += 3
            elif resp_rate > 30 or resp_rate < 15:
                severity_score += 2
            else:
                severity_score += 1
        
        # Symptoms keyword analysis
        if symptoms:
            critical_symptoms = ['seizure', 'collapse', 'coma', 'shock', 'hemorrhage']
            severe_symptoms = ['vomiting', 'diarrhea', 'dehydration', 'pain']
            
            symptoms_lower = symptoms.lower()
            if any(s in symptoms_lower for s in critical_symptoms):
                severity_score += 3
            elif any(s in symptoms_lower for s in severe_symptoms):
                severity_score += 2
                
        # Classify based on score
        if severity_score >= 7:
            return 'critical'
        elif severity_score >= 5:
            return 'severe'
        elif severity_score >= 3:
            return 'moderate'
        else:
            return 'mild'
    
    def is_contagious(self, diagnosis, symptoms):
        """
        Determine if disease is contagious
        
        Args:
            diagnosis (str): Disease diagnosis
            symptoms (str): Symptoms
            
        Returns:
            bool: True if contagious
        """
        text = (diagnosis + ' ' + (symptoms or '')).lower()
        return any(keyword in text for keyword in self.CONTAGIOUS_KEYWORDS)
    
    def get_transmission_method(self, diagnosis, symptoms):
        """
        Determine transmission method for contagious diseases
        
        Args:
            diagnosis (str): Disease diagnosis
            symptoms (str): Symptoms
            
        Returns:
            str or None: Transmission method
        """
        text = (diagnosis + ' ' + (symptoms or '')).lower()
        
        for method, keywords in self.TRANSMISSION_TYPES.items():
            if any(keyword in text for keyword in keywords):
                return method
                
        return None
    
    def migrate_disease_cases(self):
        """
        Main migration function
        Extracts medical records and creates disease cases
        """
        try:
            print("=" * 60)
            print("  Disease Cases Migration - Phase 2")
            print("=" * 60)
            print()
            
            self.db.connect()
            
            # Check for existing disease cases
            existing_query = "SELECT COUNT(*) as count FROM disease_cases"
            existing_result = self.db.execute_query(existing_query)
            existing_count = existing_result[0]['count'] if existing_result else 0
            
            print(f"📊 Existing disease cases: {existing_count}")
            print()
            
            # Fetch medical records
            query = """
            SELECT 
                mr.record_id,
                mr.pet_id,
                mr.diagnosis,
                mr.symptoms,
                mr.visit_date as record_date,
                mr.temperature,
                mr.heart_rate,
                mr.respiratory_rate,
                mr.follow_up_required,
                mr.follow_up_date,
                mr.chief_complaint,
                mr.treatment,
                mr.prescription,
                mr.notes,
                mr.veterinarian_id,
                p.species,
                p.breed,
                p.date_of_birth,
                c.city as region
            FROM medical_records mr
            JOIN pets p ON mr.pet_id = p.pet_id
            JOIN customers c ON p.customer_id = c.customer_id
            WHERE mr.diagnosis IS NOT NULL 
              AND mr.diagnosis != ''
              AND mr.diagnosis != 'N/A'
            ORDER BY mr.visit_date DESC
            """
            
            medical_records = self.db.execute_query(query)
            
            if not medical_records:
                print("❌ No medical records found to migrate")
                return
                
            print(f"📋 Found {len(medical_records)} medical records to process")
            print()
            
            migrated = 0
            skipped = 0
            
            for record in medical_records:
                # Check if already migrated
                check_query = """
                SELECT 1 FROM disease_cases 
                WHERE pet_id = %s AND disease_name = %s AND diagnosis_date = %s
                """
                exists = self.db.execute_query(check_query, (
                    record['pet_id'],
                    record['diagnosis'],
                    record['record_date']
                ))
                
                if exists:
                    skipped += 1
                    continue
                
                # Calculate age at diagnosis
                age_months = None
                if record['date_of_birth'] and record['record_date']:
                    age_delta = record['record_date'] - record['date_of_birth']
                    age_months = int(age_delta.days / 30.44)  # Average days in month
                
                # Classify disease
                category = self.classify_disease(record['diagnosis'], record['symptoms'])
                
                # Determine severity
                severity = self.determine_severity(
                    record.get('temperature'),
                    record.get('heart_rate'),
                    record.get('respiratory_rate'),
                    record.get('symptoms')
                )
                
                # Determine outcome
                outcome = 'ongoing_treatment' if record['follow_up_required'] else 'recovered'
                
                # Calculate treatment duration
                treatment_days = None
                if record['follow_up_date'] and record['record_date']:
                    duration_delta = record['follow_up_date'] - record['record_date']
                    treatment_days = duration_delta.days
                
                # Check if contagious
                contagious = self.is_contagious(record['diagnosis'], record['symptoms'])
                
                # Get transmission method
                transmission = self.get_transmission_method(
                    record['diagnosis'], 
                    record['symptoms']
                ) if contagious else None
                
                # Build notes
                notes_parts = []
                if record['chief_complaint']:
                    notes_parts.append(f"Chief Complaint: {record['chief_complaint']}")
                if record['treatment']:
                    notes_parts.append(f"Treatment: {record['treatment']}")
                if record['prescription']:
                    notes_parts.append(f"Prescription: {record['prescription']}")
                if record['notes']:
                    notes_parts.append(f"Notes: {record['notes']}")
                notes = ' | '.join(notes_parts) if notes_parts else None
                
                # Insert disease case
                insert_query = """
                INSERT INTO disease_cases (
                    pet_id, disease_name, disease_category, diagnosis_date,
                    species, breed, age_at_diagnosis, severity, outcome,
                    treatment_duration_days, symptoms, region, is_contagious,
                    transmission_method, notes, created_by, updated_by
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                self.db.execute_query(insert_query, (
                    record['pet_id'],
                    record['diagnosis'],
                    category,
                    record['record_date'],
                    record['species'],
                    record['breed'],
                    age_months,
                    severity,
                    outcome,
                    treatment_days,
                    record['symptoms'],
                    record['region'],
                    contagious,
                    transmission,
                    notes,
                    record['veterinarian_id'],
                    record['veterinarian_id']
                ), fetch=False)
                
                migrated += 1
                print(f"✓ Migrated: {record['diagnosis'][:50]} ({category}) - {severity}")
            
            print()
            print("=" * 60)
            print(f"✅ Migration Complete")
            print(f"   Migrated: {migrated} cases")
            print(f"   Skipped (already exists): {skipped} cases")
            print("=" * 60)
            print()
            
            # Show summary
            self.show_summary()
            
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            self.db.disconnect()
    
    def show_summary(self):
        """Display migration summary statistics"""
        try:
            # Category distribution
            category_query = """
            SELECT 
                disease_category,
                COUNT(*) as count,
                COUNT(DISTINCT species) as species_count,
                ROUND(AVG(age_at_diagnosis)) as avg_age,
                SUM(CASE WHEN is_contagious THEN 1 ELSE 0 END) as contagious_count
            FROM disease_cases
            GROUP BY disease_category
            ORDER BY count DESC
            """
            
            categories = self.db.execute_query(category_query)
            
            if categories:
                print("\n📊 Disease Category Distribution:")
                print("-" * 80)
                print(f"{'Category':<20} {'Cases':>8} {'Species':>10} {'Avg Age':>10} {'Contagious':>12}")
                print("-" * 80)
                for cat in categories:
                    print(f"{cat['disease_category']:<20} {cat['count']:>8} "
                          f"{cat['species_count']:>10} {int(cat['avg_age'] or 0):>10} "
                          f"{cat['contagious_count']:>12}")
                print("-" * 80)
            
            # Total summary
            total_query = "SELECT COUNT(*) as total FROM disease_cases"
            total_result = self.db.execute_query(total_query)
            total = total_result[0]['total'] if total_result else 0
            
            print(f"\n📈 Total Disease Cases in Database: {total}")
            
            # Data readiness for ML
            print(f"\n🤖 ML Readiness Assessment:")
            if total >= 200:
                print("   ✅ Excellent - Ready for advanced ML models")
            elif total >= 100:
                print("   ✅ Good - Ready for moderate ML models")
            elif total >= 50:
                print("   ⚠️  Fair - Basic ML models only")
            elif total >= 30:
                print("   ⚠️  Limited - Simple statistical analysis")
            else:
                print("   ❌ Insufficient - Need more data")
            
            print(f"   Current: {total} cases | Ideal: 200+ cases")
            print()
            
        except Exception as e:
            print(f"Warning: Could not generate summary: {str(e)}")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  VetCare Pro - Disease Cases Migration")
    print("  Phase 2: Disease Prediction ML")
    print("=" * 60)
    
    migrator = DiseaseCaseMigration()
    migrator.migrate_disease_cases()
    
    print("\n✨ Migration process completed!")
    print("   Next steps:")
    print("   1. Verify data in database")
    print("   2. Train ML models")
    print("   3. Test predictions")
    print()
