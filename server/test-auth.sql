-- Test user for authentication
-- Password: Test@123
-- Generate proper hash by running: node generate-hash.js Test@123

INSERT INTO users (
  first_name,
  last_name,
  password_hash, 
  email, 
  phone, 
  role, 
  is_active
) VALUES (
  'Test',
  'Admin',
  '$2a$10$rQ3qZ8Jx.LxJZGqK3y4rXOYhNvF6JxqE5RzGqK3y4rXOYhNvF6JxqE', -- change to hash for 'Test@123'
  'testadmin@propet.lk',
  '+94771111111',
  'admin',
  true
) ON CONFLICT (email) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  updated_at = CURRENT_TIMESTAMP;

-- Success message
SELECT 'Test user created successfully!' AS message,
       'Username: testadmin' AS username,
       'Password: Test@123' AS password;