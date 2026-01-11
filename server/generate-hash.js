// Utility script to generate bcrypt password hashes for database seeding

import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'password123';

bcrypt.genSalt(10).then(salt => {
  bcrypt.hash(password, salt).then(hash => {
    console.log('\n🔐 Password Hash Generator');
    console.log('=' .repeat(50));
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('=' .repeat(50));
    console.log('\nUse this hash in your SQL INSERT statements\n');
    process.exit(0);
  });
});
