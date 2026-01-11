# VetCare Pro - Setup Instructions

## Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Database Setup

### 1. Create Database
```bash
# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vetcarepro;

# Exit psql
\q
```

### 2. Run Schema
```bash
psql -U postgres -d vetcarepro -f database/schema.sql
```

### 3. Generate Password Hashes
```bash
cd server
node generate-hash.js password123
```

Copy the generated hash and update `database/seed.sql` with real hashes for all users.

### 4. Run Seed Data
```bash
psql -U postgres -d vetcarepro -f database/seed.sql
```

## Backend Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Environment
Create `server/.env` and update with your settings:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vetcarepro
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRE=7d

PORT=5001
NODE_ENV=development

CLIENT_URL=http://localhost:5173
```

### 3. Start Server
```bash
npm run dev
```

Server will run on http://localhost:5001

## Frontend Setup

### 1. Install Dependencies
```bash
cd client
npm install
```

### 2. Configure Environment
Create `client/.env`:
```env
VITE_API_URL=http://localhost:5001/api
```

### 3. Start Development Server
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Default Login Credentials

After running seed data:

**Admin:**
- Username: `admin`
- Password: `password123`

**Veterinarian 1:**
- Username: `vet1`
- Password: `password123`

**Veterinarian 2:**
- Username: `vet2`
- Password: `password123`

**Receptionist:**
- Username: `receptionist1`
- Password: `password123`

**Test Admin:**
- Username: `testadmin`
- Password: `Test@123`

## Testing the Application

1. Navigate to http://localhost:5173
2. Login with any of the credentials above
3. Test customer CRUD operations:
   - View customers list
   - Create new customer
   - View customer details
   - Edit customer
   - (Admin only) Delete customer
4. Test pet CRUD operations
5. Test dashboard statistics

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists

### CORS Issues
- Verify `CLIENT_URL` in server `.env`
- Check server is running on port 5001

### Login Issues
- Verify password hashes were generated correctly
- Check seed data was imported successfully
- Verify JWT_SECRET is set

## Project Structure
```
vetcarepro/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   ├── context/     # React context
│   │   └── styles/      # CSS files
│   └── .env
├── server/              # Node.js backend
│   ├── src/
│   │   ├── config/      # Configuration
│   │   ├── controllers/ # Route controllers
│   │   ├── middleware/  # Express middleware
│   │   ├── models/      # Database models
│   │   ├── routes/      # API routes
│   │   └── utils/       # Utility functions
│   └── .env
├── database/            # SQL files
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Sample data
└── ml/                  # Machine learning (future)
```
