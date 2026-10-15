const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'deflow_secret_jwt_key_2026';
const token = jwt.sign(
  { id: 'usr-1', username: 'superadmin', role: 'Super Admin' },
  JWT_SECRET,
  { expiresIn: '1h' }
);

async function testApi() {
  const baseURL = 'http://localhost:5000';
  const headers = { Authorization: `Bearer ${token}` };

  console.log('Testing POST /api/database/backup...');
  const createRes = await axios.post(`${baseURL}/api/database/backup`, { label: 'integration_test' }, { headers });
  console.log('Create Response:', createRes.data);

  console.log('\nTesting GET /api/database/backups...');
  const listRes = await axios.get(`${baseURL}/api/database/backups`, { headers });
  console.log(`Backups count: ${listRes.data.length}`);
  console.log('Latest backup:', listRes.data[0]);

  console.log('\nAPI Test Completed Successfully!');
  process.exit(0);
}

testApi().catch(e => {
  console.error('API Test Error:', e.response ? e.response.data : e.message);
  process.exit(1);
});
