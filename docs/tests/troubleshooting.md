# VetCare Pro — Troubleshooting Guide

**Stack:** React (port 5173) · Node.js/Express (port 3000) · PostgreSQL (port 5432) · Python/Flask ML (port 5001)

---

## Service Health Checks

```bash
# Node.js backend
curl http://localhost:3000/health

# ML service
curl http://localhost:5001/api/ml/health

# Frontend (should return HTML)
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

---

## Frontend — Browser Console

Open DevTools with **F12** → Console tab.

### Get auth token (after logging in via the UI)
```javascript
// Check stored token
localStorage.getItem('token')
```

### Test an API call from the browser
```javascript
const token = localStorage.getItem('token');

fetch('http://localhost:3000/api/customers', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => res.json())
.then(data => console.log(data));
```

### Common browser console checks
```javascript
// Check React auth context state (look for AuthContext in React DevTools)
// Or check localStorage directly:
localStorage.getItem('token')      // JWT token
localStorage.getItem('user')       // logged-in user object

// Clear session manually (force logout)
localStorage.clear();
location.reload();
```

### Diagnosing frontend errors
- **401 Unauthorized** — token missing or expired; log out and log back in
- **403 Forbidden** — logged-in role doesn't have access to that endpoint
- **Network Error / CORS** — backend not running on port 3000; check terminal
- **404 on a route** — check `client/src/App.jsx` for the route definition
- **Blank page / white screen** — check Console tab for a JS error; usually a missing prop or failed API call on mount

---

## Backend — Terminal

### Get a token via curl
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin1@propet.lk", "password": "admin1@pass"}' | jq
```

Save the token:
```bash
TOKEN="paste_token_here"
```

### Test a protected endpoint
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers | jq
```

### Common backend endpoint tests
```bash
# Customers
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers | jq
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/customers/CUST-0001 | jq

# Pets
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/pets | jq

# Appointments
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/appointments | jq

# Medical records
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/medical-records | jq

# Disease cases
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/disease-cases | jq

# ML service status
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/ml/models/status | jq
```

### Diagnosing backend errors
- **Cannot connect to database** — PostgreSQL not running; run `pg_ctl start` or check `brew services list`
- **401 on all requests** — JWT_SECRET mismatch between `.env` and what issued the token; restart backend
- **500 Internal Server Error** — check the Node.js terminal for the full stack trace
- **Port 3000 already in use** — `lsof -i :3000` then `kill -9 <PID>`

---

## ML Service — Terminal

### Start the ML service (always use venv)
```bash
cd ml && ./venv/bin/python app.py
# or
cd ml && ./start.sh
```

### Health check
```bash
curl http://localhost:5001/api/ml/health
```

### Check model status
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/ml/models/status | jq
```

### Diagnosing ML errors
- **ModuleNotFoundError: prophet** — running with system Python instead of venv; always use `./venv/bin/python`
- **Port 5001 already in use** — `lsof -i :5001` then `kill -9 <PID>`
- **Model not trained / low confidence** — train the model first via the Analytics page Train Model button
- **ML endpoint returning 502/503** — ML Flask service not running; start it in a separate terminal

---

## Database — psql

### Connect
```bash
psql -d vetcarepro                              # default user
psql -U vetcarepro_admin -d vetcarepro          # app user (password: admin123)
PGPASSWORD=admin123 psql -U vetcarepro_admin -d vetcarepro
```

### Common inspection queries
```sql
-- List all tables
\dt

-- Check row counts for key tables
SELECT 'customers' AS tbl, COUNT(*) FROM customers
UNION ALL SELECT 'pets', COUNT(*) FROM pets
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL SELECT 'medical_records', COUNT(*) FROM medical_records
UNION ALL SELECT 'disease_cases', COUNT(*) FROM disease_cases
UNION ALL SELECT 'billing', COUNT(*) FROM billing;

-- Check users and roles
SELECT user_id, email, role, is_active FROM users;

-- Check a specific customer
SELECT * FROM customers WHERE customer_id = 'CUST-0001';

-- Check appointments for a pet
SELECT appointment_id, appointment_date, status, reason
FROM appointments
WHERE pet_id = 'PET-0001'
ORDER BY appointment_date DESC;

-- Check medical records with missing appointment
SELECT record_id, pet_id, visit_date FROM medical_records
WHERE appointment_id IS NULL;

-- Check disease cases
SELECT case_id, pet_id, disease_name, severity, outcome
FROM disease_cases
ORDER BY diagnosis_date DESC
LIMIT 10;

-- Check inventory low stock
SELECT item_name, quantity, reorder_level
FROM inventory
WHERE quantity <= reorder_level
ORDER BY quantity ASC;

-- Check billing by status
SELECT payment_status, COUNT(*) FROM billing GROUP BY payment_status;
```

### Reset a user password
```sql
-- Hash for 'password123': $2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q
UPDATE users
SET password_hash = '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q'
WHERE email = 'admin1@propet.lk';
```

### Verify a password hash (Node.js)
If you need to check whether a password matches a hash stored in the database:

```js
// Run from server/ directory: node verify-hash.js
import bcrypt from 'bcrypt';

const password = 'admin1@pass';
const hash = '$2b$10$...'; // paste hash from DB here

const match = await bcrypt.compare(password, hash);
console.log(match ? 'Password matches' : 'No match');
```

Or generate a fresh hash for a known password:
```bash
cd server
node generate-hash.js admin1@pass
```

### Diagnosing DB errors
- **role does not exist** — user not created; run the setup SQL or use `postgres` superuser
- **relation does not exist** — schema not loaded; run `psql -U postgres -d vetcarepro -f database/schema.sql`
- **duplicate key violation** — seed data already exists; skip or truncate tables first
- **connection refused on port 5432** — PostgreSQL not running; `brew services start postgresql`

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin1@propet.lk | admin1@pass |
| Admin | admin2@propet.lk | admin2@pass |
| Veterinarian | dulani@propet.lk | password123 |
| Veterinarian | nimal@propet.lk | password123 |
| Receptionist | kumari@propet.lk | password123 |
