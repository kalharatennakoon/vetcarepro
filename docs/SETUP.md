# VetCare Pro - Setup Instructions

## Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)
- npm

## Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE vetcarepro;"

# Run schema and seed data
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql
```

## Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=postgres
DB_PASSWORD=

JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d

PORT=5001
NODE_ENV=development

CLIENT_URL=http://localhost:5173
```

Start server:
```bash
npm run dev
```

## Frontend Setup

```bash
cd client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5001/api
VITE_APP_NAME=VetCare Pro
```

Start frontend:
```bash
npm run dev
```

## Access Application

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5001
- **Login Credentials:** See [CREDENTIALS.md](CREDENTIALS.md)
