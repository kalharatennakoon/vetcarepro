import bcrypt from 'bcrypt';

const dbHashCurrent = '$2b$10$nFU.Da20tayrziV/.Lwa5u2oIHEPRYdL/VZy2bGd2yxVjAsPhNule';
const dbHashSeed = '$2b$10$aZ.3tPh6cIievJUzRWgZl.JDvLpbJtgPvWXxoAE6PofjsCtRkvkTe';

async function testPasswords() {
  console.log('=== Testing Current DB Hash ===');
  console.log('Hash:', dbHashCurrent, '\n');
  
  const passwords = ['admin1@pass', 'password123', 'admin1', 'admin123', 'Admin1@pass'];
  
  for (const password of passwords) {
    const matches = await bcrypt.compare(password, dbHashCurrent);
    console.log(`Password "${password}": ${matches ? '✓ MATCH' : '✗ NO MATCH'}`);
  }
  
  console.log('\n=== Testing Seed File Hash ===');
  console.log('Hash:', dbHashSeed, '\n');
  
  for (const password of passwords) {
    const matches = await bcrypt.compare(password, dbHashSeed);
    console.log(`Password "${password}": ${matches ? '✓ MATCH' : '✗ NO MATCH'}`);
  }
}

testPasswords().catch(console.error);
