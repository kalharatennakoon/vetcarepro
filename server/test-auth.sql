-- Test user for authentication
-- Password: Test@123

-- This hash is for password: Test@123
-- Generated using bcrypt with 10 rounds

INSERT INTO users (
  username, 
  password_hash, 
  full_name, 
  email, 
  phone, 
  role, 
  is_active
) VALUES (
  'testadmin',
  '$2b$10$0HhC1Sv6j673hpM3yhCMYu1XIAhdWujQXjRIsv8BN43/XNvu79z1W',
  'Test Admin User',
  'testadmin@propet.lk',
  '+94771111111',
  'admin',
  true
) ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = CURRENT_TIMESTAMP;

-- Success message
SELECT 'Test user created successfully!' AS message,
       'Username: testadmin' AS username,
       'Password: Test@123' AS password;