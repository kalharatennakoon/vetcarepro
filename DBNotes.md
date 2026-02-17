## Database Notes

### PostgreSQL users & passwords

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

### Database SQL queries
- List all tables:
  ```sql
  \dt
  ``` 
- Describe table structure:
  ```sql
  \d table_name
  ```
- View first 10 rows of a table:
  ```sql
  SELECT * FROM table_name LIMIT 10;
  ```
  
- Update password hash for a user by email:
  ```sql
  UPDATE users 
  SET password_hash = '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q'
  WHERE email = 'testadmin@propet.lk';

  >> Replace the hash with the one you generated for your password.
  ```
  
  Password: password123
  Hash: $2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q

  Then verify the update:
  ```sql
  SELECT email, first_name, last_name, role FROM users WHERE email = 'testadmin@propet.lk';
  ```

- Fresh start (if you want to reload all seed data)
  If you want to completely reload the seed data:
  ```bash
  # Drop and recreate the database
  psql -U postgres -c "DROP DATABASE vetcarepro;"
  psql -U postgres -c "CREATE DATABASE vetcarepro;"

  # Reload schema and seed data
  psql -U postgres -d vetcarepro -f database/schema.sql
  psql -U postgres -d vetcarepro -f database/seed.sql
  ```

- Create Password Hash Generator Script
  You can create a simple Node.js script to generate bcrypt password hashes for you. Create a file named `generate-hash.js` in the `server` directory and run it as follows:

  ```bash
  cd server
  node generate-hash.js your_password_here
  Example:
    cd server
    node generate-hash.js password123
    node generate-hash.js Test@123
  ```

  OUTPUT:
  ```
  kalharatennakoon@KTs-MacBook-Air server % node generate-hash.js Test@123

  🔐 Password Hash Generator
  ==================================================
  Password: Test@123
  Hash: $2b$10$MF7EuL4bpRAE7eOyisFECu/pfuXPzNh5fXPhSF3YzICNW8ljaT9Be
  ==================================================
  Use this hash in your SQL INSERT statements
  ```

- Copy the generated hash and update seed.sql accordingly.
- Example SQL snippet to insert users with generated password hashes:
  ```sql
  -- Insert Users (Staff)
  -- Passwords: password123 for all users
  INSERT INTO users (first_name, last_name, password_hash, email, phone, role, specialization, license_number, is_active) VALUES
  ('Dr. Dulani', 'Gunathilake', 'PASTE_GENERATED_HASH_HERE', 'dulani@propet.lk', '+94712345001', 'admin', 'Veterinary Administration', 'SLVMC-2015-001', true),
  ('Dr. Nimal', 'Amarasinghe', 'PASTE_GENERATED_HASH_HERE', 'nimal@propet.lk', '+94712345002', 'veterinarian', 'Small Animal Medicine', 'SLVMC-2018-045', true),
  ('Dr. Ayesha', 'Bandara', 'PASTE_GENERATED_HASH_HERE', 'ayesha@propet.lk', '+94712345003', 'veterinarian', 'Surgery & Emergency Care', 'SLVMC-2019-078', true),
  ('Kumari', 'Dissanayake', 'PASTE_GENERATED_HASH_HERE', 'kumari@propet.lk', '+94712345004', 'receptionist', NULL, NULL, true),
  ('Test', 'Admin', 'PASTE_GENERATED_HASH_HERE', 'testadmin@propet.lk', '+94771111111', 'admin', NULL, NULL, true);
  ```

- Re run the seed file:
  ```bash
  psql -U postgres -d vetcarepro -f database/seed.sql
  ```

- Change one value example:
  ```sql
  UPDATE users 
  SET first_name = 'Dr. Dulani', 
      last_name = 'Gunathilake',
      email = 'dulani@propet.lk',
      password_hash = '$2b$10$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q'
  WHERE email = 'dulani@propet.lk';
  
  OR

  psql -U postgres -d vetcarepro -c "UPDATE users SET first_name = 'Dr. Dulani', last_name = 'Gunathilake', password_hash = '\$2b\$10\$pYYBWaW1oe70cLoosN8H1.3DqfYM5aNwZ.DuNAHflkf8..zEtdv9q' WHERE email = 'dulani@propet.lk';"
  ``` 
  verify:
  ```sql
  SELECT email, first_name, last_name FROM users WHERE email = 'dulani@propet.lk';
  ```











### Login Credentials for Testing

**Admin Users:**
- Email: `admin1@propet.lk` | Password: `admin1@pass` | Role: Admin
- Email: `admin2@propet.lk` | Password: `admin2@pass` | Role: Admin

**Other Users (Veterinarians & Receptionists):**
- Email: `dulani@propet.lk` | Password: `password123` | Role: Veterinarian
- Email: `nimal@propet.lk` | Password: `password123` | Role: Veterinarian
- Email: `ayesha@propet.lk` | Password: `password123` | Role: Veterinarian
- Email: `kumari@propet.lk` | Password: `password123` | Role: Receptionist
- Email: `sanduni@propet.lk` | Password: `password123` | Role: Receptionist

### Test API endpoints with curl:

```bash
# Test Node.js API
curl http://localhost:3000/health

# Test ML Service (Python Flask)
curl http://localhost:5001/api/ml/health

# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin1@propet.lk", "password": "admin1@pass"}'

# Test ML endpoints with authentication
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/ml/models/status
```
