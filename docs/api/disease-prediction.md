# Disease Prediction API

Endpoints for disease classification, outbreak risk assessment, trend analysis, and individual-animal risk.

Related: [`README.md`](README.md) for API conventions; [`../ml-system-overview.md`](../ml-system-overview.md) §1 for the model; [`../decision-support/disease-analytics.md`](../decision-support/disease-analytics.md) for interpretation.

---

## Conventions

All paths are proxied by the Node backend, which authenticates and applies role checks before forwarding to Flask on port 5001. The Flask service is not exposed directly.

Requests require a staff bearer token. Several endpoints are further restricted to veterinarians and administrators, reflecting the clinical boundary in [`../rbac.md`](../rbac.md).

Responses use the standard envelope described in [`README.md`](README.md).

---

## Endpoints

| Method | Path | Description | Access |
|---|---|---|---|
| `POST` | `/api/ml/disease/train` | Train or retrain the disease prediction model | Private (Admin only) |
| `POST` | `/api/ml/disease/predict` | Predict disease outbreak | Private |
| `GET` | `/api/ml/disease/trends` | Get disease trends | Private |
| `POST` | `/api/ml/disease/pet-risk` | Predict individual pet disease risk over time horizons | Private (vet + admin) |
| `POST` | `/api/ml/disease/cancer-risk` | Estimate cancer/tumor risk based on breed and age | Private (vet + admin) |
| `POST` | `/api/ml/disease/outbreak-risk` | Assess disease activity risk based on recent cases | Private |
| `GET` | `/api/ml/disease/forecast` | Get monthly disease activity forecast | Private |
| `GET` | `/api/ml/disease/outbreak-trend` | Project outbreak trend forward (?species=&days_ahead=90) | Private (vet + admin) |
| `GET` | `/api/ml/disease/pandemic-risk` | Assess pandemic/epidemic potential (?species=) | Private (vet + admin) |

Supporting endpoints not specific to disease:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/ml/health` | Service health |
| `GET` | `/api/ml/models/status` | Which models are loaded, and their training dates |
| `GET` | `/api/ml/retrain-check` | Whether accumulated data justifies retraining |

---

## Usage

### 1. Confirm a model is loaded

```bash
curl http://localhost:3000/api/ml/models/status \
  -H "Authorization: Bearer <token>"
```

A fresh clone has no trained models — `ml/models/*.pkl` is gitignored. Every prediction endpoint will report the model as unavailable until training runs. This is expected, not a fault.

### 2. Train

```bash
curl -X POST http://localhost:3000/api/ml/disease/train \
  -H "Authorization: Bearer <admin_token>"
```

Administrator-only. Reads directly from PostgreSQL and writes a dated pickle into `ml/models/`. At startup the service loads the newest file per model type.

### 3. Assess outbreak risk

```bash
curl -X POST http://localhost:3000/api/ml/disease/outbreak-risk \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"species": "Dog", "days": 365}'
```

The `days` window determines how far back cases are examined. See [`../decision-support/disease-analytics.md`](../decision-support/disease-analytics.md) for choosing one — **at least 365 days is recommended for a reliable assessment.** Shorter windows on a thin dataset produce volatile figures that a handful of cases can swing.

### 4. Explain the result

```bash
curl -X POST http://localhost:3000/api/ai/explain \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"output_type": "outbreak_risk", "data": { }}'
```

Passes raw model output to the assistant for a plain-language explanation. Requires Ollama.

---

## Interpretation

**Classification suggests, it does not diagnose.** `/predict` reports which category past cases with similar characteristics belonged to. The model has not examined the animal. See [`../SCOPE.md`](../SCOPE.md) §4.7.

**Risk scores are relative to the clinic's own history.** A "high" score means elevated against this clinic's baseline, not against a veterinary standard. The figure is not comparable across clinics.

**Sparse data still returns a number.** These endpoints do not refuse to answer when history is thin. Check `/models/status` for the training date and consider the underlying case volume before acting on a figure.

**Species filtering changes the baseline.** A species-filtered request compares against that species' history only, which may be a much smaller sample than the unfiltered figure.