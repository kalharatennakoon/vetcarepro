-- Add profile_image column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_image VARCHAR(255);

-- Add image column to pets table
ALTER TABLE pets
ADD COLUMN IF NOT EXISTS image VARCHAR(255);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image);
CREATE INDEX IF NOT EXISTS idx_pets_image ON pets(image);
