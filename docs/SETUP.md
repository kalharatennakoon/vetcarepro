# VetCare Pro — Setup Instructions

## Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Python 3.10+
- npm

---

## 1. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE vetcarepro;"
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql
```

---

## 2. Backend Setup

```bash
cd server
npm install
```

Copy the environment file and configure it:
```bash
cp .env.example .env
```

Key values in `server/.env`:
```env
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=vetcarepro_admin
DB_PASSWORD=admin123

JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d

ML_SERVICE_URL=http://localhost:5001

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password_here
```

Start the backend:
```bash
npm run dev
```

Backend runs on `http://localhost:3000`

---

## 3. Frontend Setup

```bash
cd client
npm install
```

Copy the environment file:
```bash
cp .env .env.local
```

Key values in `client/.env`:
```env
VITE_API_URL=http://localhost:3000/api
VITE_ML_API_URL=http://localhost:3000/api/ml
VITE_APP_NAME=VetCare Pro
```

Start the frontend:
```bash
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 4. ML Service Setup

```bash
cd ml
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy the environment file:
```bash
cp .env.example .env
```

Start the ML service:
```bash
./start.sh
# or
./venv/bin/python app.py
```

> Always use `./start.sh` or `./venv/bin/python` — not `python app.py` directly.

ML service runs on `http://localhost:5001`

---

## 5. Verify All Services

```bash
curl http://localhost:3000/health
curl http://localhost:5001/api/ml/health
```

---

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| ML Service | http://localhost:5001/api/ml |

See `DATABASE.md` for login credentials and database connection details.
