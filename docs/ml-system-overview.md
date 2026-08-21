# ML Prediction System — Overview

The predictive analytics layer: what each model does, the data it learns from, and how models are trained and served.

Written for clinic staff and stakeholders as well as developers. For acting on the output, see [`decision-support/`](decision-support/). For the API, see [`api/README.md`](api/README.md).

---

## What this is

The system learns from the clinic's own historical data to make forward-looking estimates. Three modules:

| Module | Question it answers |
|---|---|
| Disease prediction | What illness patterns are emerging, and how likely is an outbreak? |
| Sales forecasting | What revenue should the clinic expect next month? |
| Inventory demand forecasting | What will run out, and when should it be reordered? |

A fourth component, the pet health predictor, assesses individual-animal risk using breed predisposition data rather than a trained model.

Accuracy improves as the clinic records more data. Early on, with a thin history, output should be treated as indicative rather than reliable.

> **Every output is decision support.** These are estimates from historical patterns, not statements of fact about the future. The assistant can explain any of them in plain language via `POST /api/ai/explain`.

---

## 1. Disease prediction

**Techniques:** Random Forest classification, K-Means clustering, Prophet time-series forecasting
**Script:** `ml/scripts/disease_prediction.py`

Identifies patterns in past cases, predicts which category a new case likely belongs to, assesses activity risk from recent trends, and forecasts future activity over periods from one month to five years.

### Data sources

| Source | Table | Captures |
|---|---|---|
| Disease cases | `disease_cases` | Monthly counts, contagious cases, severity, unique diseases — filterable by species and category |
| Appointments | `appointments` | Monthly visits and unique pets seen, excluding cancelled |
| Medical records | `medical_records` | Monthly record counts and follow-up flags |
| Pet demographics | `pets` | Species distribution and average age, active pets only |

### How it works

The model learns which combinations of species, age, severity, and related factors tend to accompany which disease category. A new case is compared against those learned patterns and the most likely category is suggested.

Activity risk is scored monthly across weighted factors and mapped to a risk level. Clustering groups cases with similar profiles, so that when one animal in a group develops a condition, others can be monitored more closely.

---

## 2. Sales forecasting

**Techniques:** Prophet, Random Forest
**Script:** `ml/scripts/sales_forecasting.py`

Projects revenue from billing history, capturing trend and seasonality. Prophet handles the time-series component — recurring monthly and seasonal shape — while Random Forest contributes on feature-driven variation.

Reads from `billing`, `billing_items`, and the pre-aggregated `daily_sales_summary`.

Also surfaces revenue trends and top revenue-generating services.

---

## 3. Inventory demand forecasting

**Technique:** Gradient Boosting
**Script:** `ml/scripts/inventory_forecasting.py`

Predicts consumption per item from transaction history, producing reorder suggestions, fast-moving item identification, category-level demand analysis, and restock-date prediction.

Reads from `inventory` and `inventory_transactions`.

---

## 4. Pet health predictor

**Script:** `ml/scripts/pet_health_predictor.py`

Distinct from the three trained models. Assesses individual-animal risk — disease risk, cancer and tumour risk, outbreak trend projection, pandemic risk — using breed predisposition tables drawn from veterinary literature combined with rule-based scoring.

Because it is rule-based rather than learned, it requires no training and is available immediately. Its limitation is the reverse: it does not adapt to the clinic's own data.

---

## Training and serving

### Offline training, on-demand

Models are trained through administrator-only endpoints (`POST /api/ml/{disease,sales,inventory}/train`), never automatically. Training reads directly from PostgreSQL.

Trained models are pickled into `ml/models/` with dated filenames — `disease_prediction_20260721.pkl`. At startup `ml/app.py` loads the newest file per model type.

`GET /api/ml/retrain-check` compares current data volume against what each stored model was trained on and indicates whether retraining is worthwhile.

### Models are not in version control

`ml/models/*.pkl` is gitignored. A fresh clone has no trained models, and analytics endpoints will report models as unavailable until training is triggered.

This is expected behaviour rather than a fault, and worth knowing before a demonstration — the failure presents as an empty analytics page, which looks like a bug.

### Serving path

The Flask service is not exposed to clients. The Node backend proxies `/api/ml/*` through `server/src/services/mlService.js`, applying authentication and role checks first. The ML service performs no authentication of its own.

---

## Interpreting output responsibly

**Historical patterns, not certainty.** A forecast describes what past data suggests, on the assumption that conditions continue to resemble the past. A new competitor, a supply disruption, or a genuinely novel outbreak are all invisible to it.

**Data volume governs reliability.** A model trained on a few months of records will produce output; that output is weakly grounded. Prefer directional reading — rising, falling, stable — over precise figures early on.

**Disease predictions are not diagnoses.** A category suggestion is a starting point for examination, never a substitute. This constraint is permanent — see [`SCOPE.md`](SCOPE.md) §4.7.

**Explanations do not add certainty.** The assistant can restate a forecast in plain language. Fluent phrasing may make an estimate feel more authoritative than the underlying data supports.