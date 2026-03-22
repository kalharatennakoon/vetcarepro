"""
Pet Health Predictor
Purpose: Individual pet disease risk, cancer/tumor risk, outbreak trend
         projection, and pandemic risk assessment.
Date: 2026-03-19
"""

import sys
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config.db_connection import get_raw_db_connection as get_db_connection


# ── Breed cancer predisposition tables (veterinary literature baseline) ──────
BREED_CANCER_RISK = {
    'Golden Retriever':      {'overall': 0.60, 'lymphoma': 0.20, 'hemangiosarcoma': 0.10, 'osteosarcoma': 0.06, 'mast_cell_tumor': 0.08},
    'Bernese Mountain Dog':  {'overall': 0.55, 'histiocytic_sarcoma': 0.25, 'lymphoma': 0.10, 'osteosarcoma': 0.08},
    'Rottweiler':            {'overall': 0.45, 'osteosarcoma': 0.15, 'lymphoma': 0.10},
    'Boxer':                 {'overall': 0.45, 'mast_cell_tumor': 0.20, 'lymphoma': 0.12, 'brain_tumor': 0.08},
    'Scottish Terrier':      {'overall': 0.42, 'bladder_cancer': 0.18, 'lymphoma': 0.10},
    'Flat-Coated Retriever': {'overall': 0.50, 'histiocytic_sarcoma': 0.20, 'lymphoma': 0.12},
    'German Shepherd':       {'overall': 0.30, 'hemangiosarcoma': 0.12, 'osteosarcoma': 0.07},
    'Labrador Retriever':    {'overall': 0.31, 'lymphoma': 0.10, 'mast_cell_tumor': 0.08},
    'Bulldog':               {'overall': 0.28, 'mast_cell_tumor': 0.12, 'lymphoma': 0.08},
    'Siamese':               {'overall': 0.22, 'intestinal_lymphoma': 0.12, 'mediastinal_lymphoma': 0.07},
    'Persian':               {'overall': 0.18, 'lymphoma': 0.09},
    'Maine Coon':            {'overall': 0.20, 'lymphoma': 0.10, 'carcinoma': 0.06},
}

SPECIES_BASE_CANCER_RISK = {
    'Dog':    {'overall': 0.30, 'common': ['lymphoma', 'mast_cell_tumor', 'osteosarcoma', 'hemangiosarcoma', 'mammary_tumor']},
    'Cat':    {'overall': 0.20, 'common': ['lymphoma', 'squamous_cell_carcinoma', 'mammary_tumor', 'fibrosarcoma']},
    'Rabbit': {'overall': 0.10, 'common': ['uterine_cancer', 'lymphoma']},
    'Bird':   {'overall': 0.08, 'common': ['xanthoma', 'lipoma', 'papilloma']},
}


def _age_cancer_multiplier(species, age_months):
    age_years = (age_months or 36) / 12.0
    if species in ('Dog', 'Cat'):
        if age_years < 2:  return 0.1
        if age_years < 4:  return 0.3
        if age_years < 7:  return 0.7
        if age_years < 10: return 1.5
        return 2.5
    elif species == 'Rabbit':
        if age_years < 2:  return 0.2
        if age_years < 5:  return 0.8
        return 1.8
    return 1.0


class PetHealthPredictor:

    def __init__(self):
        self._cache = None
        self._cached_at = None

    def _load(self):
        now = datetime.now()
        if self._cache is not None and self._cached_at and (now - self._cached_at).seconds < 300:
            return self._cache
        conn = get_db_connection()
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT case_id, pet_id, disease_name, disease_category,
                       diagnosis_date, species, breed, age_at_diagnosis,
                       severity, outcome, is_contagious, transmission_method, region
                FROM disease_cases ORDER BY diagnosis_date ASC
            """)
            rows = cur.fetchall()
            cols = [d[0] for d in cur.description]
            df = pd.DataFrame(rows, columns=cols)
            if not df.empty:
                df['diagnosis_date'] = pd.to_datetime(df['diagnosis_date'])
                df['age_at_diagnosis'] = pd.to_numeric(df['age_at_diagnosis'], errors='coerce')
            cur.close()
            self._cache = df
            self._cached_at = now
            return df
        finally:
            conn.close()

    # ── 1. Individual Pet Disease Risk ────────────────────────────────────────

    def predict_individual_risk(self, species, breed=None, age_months=None,
                                past_diseases=None, time_horizons=None):
        """
        Predict disease recurrence risk for a specific pet based solely on
        that pet's own past disease records.
        """
        from collections import Counter

        if time_horizons is None:
            time_horizons = [1, 6, 12, 24]

        result = {
            'species': species, 'breed': breed, 'age_months': age_months,
            'time_horizons': time_horizons, 'risks': {},
            'top_risks': [], 'data_confidence': 'low', 'notes': []
        }

        if not past_diseases:
            return result

        cat_counts = Counter(
            d.get('disease_category') for d in past_diseases
            if d.get('disease_category')
        )

        if not cat_counts:
            return result

        total_records = len(past_diseases)
        result['data_confidence'] = (
            'high' if total_records >= 10 else
            'medium' if total_records >= 4 else
            'low'
        )

        def base_12mo_risk(count):
            """Recurrence probability at 12 months based on occurrence count."""
            if count == 1: return 0.25
            if count == 2: return 0.45
            return min(0.25 + count * 0.15, 0.80)

        category_risks = {}
        for cat, count in cat_counts.items():
            risk_12mo = base_12mo_risk(count)
            category_risks[cat] = {
                f'{t}mo': round(min(risk_12mo * (t / 12.0), 0.90) * 100, 1)
                for t in time_horizons
            }
            if count >= 3:
                result['notes'].append(
                    f'{cat.replace("_", " ").title()} recorded {count} times — elevated recurrence risk.'
                )

        result['risks'] = category_risks
        sorted_risks = sorted(category_risks.items(), key=lambda x: x[1].get('12mo', 0), reverse=True)
        result['top_risks'] = [
            {
                'category': cat,
                'risk_12mo': data.get('12mo', 0),
                'risk_level': 'high' if data.get('12mo', 0) > 40 else 'medium' if data.get('12mo', 0) > 20 else 'low'
            }
            for cat, data in sorted_risks
        ]
        return result

    # ── 2. Cancer / Tumor Risk ────────────────────────────────────────────────

    def predict_cancer_risk(self, species, breed=None, age_months=None, sex=None):
        """
        Estimate cancer/tumor risk based on breed predisposition tables and
        age-adjusted multipliers from published veterinary studies.
        """
        result = {
            'species': species, 'breed': breed,
            'age_months': age_months, 'sex': sex,
            'overall_risk_pct': None, 'cancer_types': [],
            'age_risk_factor': None, 'risk_level': 'unknown',
            'screening_recommendations': [],
            'data_source': 'veterinary_literature_baseline',
            'notes': []
        }

        breed_data = BREED_CANCER_RISK.get(breed) if breed else None
        species_data = SPECIES_BASE_CANCER_RISK.get(species, {'overall': 0.15, 'common': []})
        source = breed_data or species_data

        base_risk = source.get('overall', 0.15)
        age_factor = _age_cancer_multiplier(species, age_months)
        adjusted = min(base_risk * age_factor, 0.95)

        result['overall_risk_pct'] = round(adjusted * 100, 1)
        result['age_risk_factor'] = round(age_factor, 2)
        result['risk_level'] = 'high' if adjusted >= 0.50 else 'medium' if adjusted >= 0.25 else 'low'

        for key, val in source.items():
            if key in ('overall', 'common'):
                continue
            risk_pct = round(min(val * age_factor * 100, 95.0), 1)
            result['cancer_types'].append({
                'type': key.replace('_', ' ').title(),
                'risk_pct': risk_pct,
                'risk_level': 'high' if risk_pct > 20 else 'medium' if risk_pct > 10 else 'low'
            })

        if 'common' in source:
            existing = {ct['type'].lower().replace(' ', '_') for ct in result['cancer_types']}
            for c in source['common']:
                if c not in existing:
                    result['cancer_types'].append({
                        'type': c.replace('_', ' ').title(),
                        'risk_pct': None,
                        'risk_level': 'monitor'
                    })

        age_years = (age_months or 36) / 12.0
        recs = []
        if result['risk_level'] == 'high':
            recs = [
                'Annual CBC + chemistry blood panel',
                'Semi-annual physical with lymph node check',
                'Annual chest X-ray',
                'Early spay/neuter reduces mammary/testicular cancer risk',
            ]
        elif result['risk_level'] == 'medium':
            recs = ['Annual blood panel', 'Bi-annual physical examination']
        else:
            recs = ['Annual routine blood panel', 'Regular weight monitoring']

        if age_years >= 7:
            recs.append('Senior wellness screen every 6 months for pets over 7 years')
        if sex == 'Female':
            recs.append('Spay recommended to significantly reduce mammary tumor risk')
        result['screening_recommendations'] = recs

        if not breed_data:
            result['notes'].append('Breed-specific data not available; using species-level estimates.')
        result['notes'].append(
            'Estimates based on published veterinary studies. '
            'Accuracy improves with lab biomarker data (CBC, chemistry panel).'
        )
        return result

    # ── 3. Outbreak Trend Projection ──────────────────────────────────────────

    def predict_outbreak_trend(self, days_ahead=90, species=None):
        """
        Project disease outbreak trends forward using historical weekly case
        counts and a dampened growth model.
        """
        df = self._load()
        result = {
            'species': species or 'All Species', 'days_ahead': days_ahead,
            'historical_weekly': [], 'projected_weekly': [],
            'growth_rate_pct': 0.0, 'trend_direction': 'stable',
            'peak_risk_week': None, 'notes': []
        }

        if df.empty:
            result['notes'].append('No historical data available.')
            return result

        if species:
            df = df[df['species'] == species]
            if df.empty:
                result['notes'].append(f'No cases for species: {species}')
                return result

        end_date = pd.Timestamp.now().date()
        start_date = end_date - timedelta(weeks=52)
        recent = df[df['diagnosis_date'].dt.date >= start_date].copy()

        if recent.empty:
            result['notes'].append('No cases in the last 52 weeks.')
            return result

        recent['week'] = recent['diagnosis_date'].dt.to_period('W')
        weekly_counts = recent.groupby('week').size()
        all_weeks = pd.period_range(start=str(start_date), end=str(end_date), freq='W')
        weekly_full = weekly_counts.reindex(all_weeks, fill_value=0)

        result['historical_weekly'] = [
            {'week': str(w), 'cases': int(c)} for w, c in weekly_full.items()
        ]

        vals = weekly_full.values.astype(float)
        if len(vals) >= 16:
            recent_avg = np.mean(vals[-8:])
            prior_avg = np.mean(vals[-16:-8])
            growth = ((recent_avg - prior_avg) / prior_avg * 100) if prior_avg > 0 else 0.0
        else:
            growth = 0.0

        result['growth_rate_pct'] = round(float(growth), 1)
        result['trend_direction'] = 'rising' if growth > 15 else 'declining' if growth < -15 else 'stable'

        n_weeks = max(1, days_ahead // 7)
        base = float(np.mean(vals[-min(8, len(vals)):])) if len(vals) > 0 else 0.0
        weekly_growth = growth / 100 / 4

        last_week = all_weeks[-1] + 1
        projected = []
        peak_val, peak_week = 0.0, None
        for i in range(n_weeks):
            proj = max(0.0, base * (1 + weekly_growth) ** i)
            w_str = str(last_week + i)
            projected.append({'week': w_str, 'cases': round(proj, 1)})
            if proj > peak_val:
                peak_val, peak_week = proj, w_str

        result['projected_weekly'] = projected
        if result['trend_direction'] == 'rising':
            result['peak_risk_week'] = peak_week

        return result

    # ── 4. Pandemic Risk ──────────────────────────────────────────────────────

    def assess_pandemic_risk(self, species_filter=None):
        """
        Assess pandemic/epidemic potential using R0 estimation, cross-species
        spread analysis, and fastest-growing disease categories.
        """
        df = self._load()
        result = {
            'r0_estimate': 0.0, 'pandemic_level': 'low',
            'contagious_rate_pct': 0.0,
            'cross_species_diseases': [], 'fastest_spreading': [],
            'species_at_risk': [], 'recommendations': [], 'notes': []
        }

        if df.empty:
            result['notes'].append('No disease data available.')
            return result

        cutoff = datetime.now() - timedelta(days=365)
        recent = df[df['diagnosis_date'] >= cutoff].copy()
        if recent.empty:
            recent = df.copy()
            result['notes'].append('Using all-time data (no cases in last 12 months).')

        if species_filter:
            recent = recent[recent['species'] == species_filter]

        total = len(recent)
        if total == 0:
            return result

        contagious = recent[recent['is_contagious'] == True]
        rate = len(contagious) / total
        result['contagious_rate_pct'] = round(rate * 100, 1)

        tx_types = contagious['transmission_method'].nunique() if not contagious.empty else 0
        sp_spread = contagious['species'].nunique() if not contagious.empty else 0
        r0 = rate * (1 + tx_types * 0.3) * (1 + max(0, sp_spread - 1) * 0.5)
        result['r0_estimate'] = round(float(r0), 2)
        result['pandemic_level'] = 'high' if r0 >= 2.0 else 'medium' if r0 >= 1.0 else 'low'

        if not contagious.empty:
            ds = contagious.groupby('disease_name')['species'].nunique()
            cross = ds[ds > 1].sort_values(ascending=False)
            result['cross_species_diseases'] = [
                {'disease': d, 'species_count': int(n)} for d, n in cross.head(5).items()
            ]
            sp_counts = contagious['species'].value_counts()
            result['species_at_risk'] = [
                {'species': s, 'contagious_cases': int(c)} for s, c in sp_counts.head(5).items()
            ]

        c3 = datetime.now() - timedelta(days=90)
        c6 = datetime.now() - timedelta(days=180)
        r3 = recent[recent['diagnosis_date'] >= c3]
        p3 = recent[(recent['diagnosis_date'] >= c6) & (recent['diagnosis_date'] < c3)]
        if not r3.empty and not p3.empty:
            rc = r3['disease_category'].value_counts()
            pc = p3['disease_category'].value_counts()
            growth = {}
            for cat in rc.index:
                r_val, p_val = rc.get(cat, 0), pc.get(cat, 0)
                growth[cat] = round(((r_val - p_val) / p_val * 100) if p_val > 0 else 100.0, 1)
            result['fastest_spreading'] = [
                {'category': cat, 'growth_pct': pct}
                for cat, pct in sorted(growth.items(), key=lambda x: x[1], reverse=True)[:3]
                if pct > 0
            ]

        if result['pandemic_level'] == 'high':
            result['recommendations'] = [
                'Immediate isolation protocol for all contagious cases',
                'Cross-contamination prevention between species wards',
                'Notify regional veterinary health authorities',
                'Daily case monitoring',
            ]
        elif result['pandemic_level'] == 'medium':
            result['recommendations'] = [
                'Standard isolation for contagious cases',
                'Weekly monitoring of new case clusters',
                'Review vaccination coverage for at-risk species',
            ]
        else:
            result['recommendations'] = [
                'Routine infection control protocols are sufficient.'
            ]

        result['notes'].append(
            'R0 is estimated from available case data. '
            'Clinical judgement should supplement these results.'
        )
        return result
