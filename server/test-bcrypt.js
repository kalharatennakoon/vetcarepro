import bcrypt from 'bcryptjs';

const password = 'Test@123';
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMye4IVJfJRpZQNLqnJZXQNqHDpLkTWHqLu';

console.log('Testing password:', password);
console.log('Against hash:', hash);

bcrypt.compare(password, hash).then(result => {
  console.log('Match:', result);
  
  // Also generate a fresh hash to verify
  bcrypt.genSalt(10).then(salt => {
    bcrypt.hash(password, salt).then(newHash => {
      console.log('\nFresh hash for Test@123:', newHash);
      process.exit(0);
    });
  });
});
