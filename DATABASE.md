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

`schema.sql` + `seed.sql` alone leaves out everything added since the base schema — including `ai_briefings`, `pet_photo_guidance`, and the `pgvector`/`rag_chunks` store the AI assistant needs to start up. Apply `database/migrations/*.sql` next; see [`docs/setup.md`](docs/setup.md#migrations) for the individual commands.

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

Seeded staff accounts and their passwords are listed in `database/seed.sql` (or `demo_seed.sql`) alongside the `INSERT INTO users` statements — check there rather than here.
