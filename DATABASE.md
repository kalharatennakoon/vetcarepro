# Database Configuration

## Connection Details

```bash
database name: vetcarepro
users:
  - postgres (superuser) → no password
  - kalharatennakoon (your user) → no password
  - vetcarepro_admin (app user) → password: admin123

psql -d vetcarepro → No password required ()
psql -U postgres -d vetcarepro → No password required (superuser)
psql -U kalharatennakoon -d vetcarepro → No password required (your user: kalharatennakoon)
psql -U vetcarepro_admin -d vetcarepro → password: admin123 (app user)

Also work with these connection strings:
PGPASSWORD=admin123 psql -d vetcarepro -U vetcarepro_admin
psql postgresql://vetcarepro_admin:admin123@localhost/vetcarepro
```

---

## Setup & Reset

### Load schema and seed data
```bash
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql
```

### Fresh start (drop and recreate)
```bash
psql -U postgres -c "DROP DATABASE vetcarepro;"
psql -U postgres -c "CREATE DATABASE vetcarepro;"
psql -U postgres -d vetcarepro -f database/schema.sql
psql -U postgres -d vetcarepro -f database/seed.sql
```

---

## Password Management

### Generate a bcrypt hash
```bash
cd server
node generate-hash.js your_password_here
```

### Reset a user's password
```sql
UPDATE users
SET password_hash = '$2b$10$...'
WHERE email = 'user@propet.lk';
```

---

## Test Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin1@propet.lk | admin1@pass |
| Admin | admin2@propet.lk | admin2@pass |
| Veterinarian | dulani@propet.lk | password123 |
| Veterinarian | nimal@propet.lk | password123 |
| Veterinarian | ayesha@propet.lk | password123 |
| Receptionist | kumari@propet.lk | password123 |
| Receptionist | sanduni@propet.lk | password123 |
