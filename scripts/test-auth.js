const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3010${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', e => reject(e));
    req.end();
  });
}

async function runTests() {
  console.log('Testing API authentication...\n');

  // Test 1: Stats endpoint without auth
  try {
    const statsResult = await makeRequest('/api/edgar/stats');
    console.log(`GET /api/edgar/stats (no auth): ${statsResult.status}`);
    if (statsResult.status === 401 || statsResult.status === 403) {
      console.log('✅ Stats endpoint correctly rejects unauthenticated requests\n');
    } else {
      console.log(`❌ Stats endpoint should return 401/403, got ${statsResult.status}\n`);
    }
  } catch (e) {
    console.log(`ERROR testing stats endpoint: ${e.message}\n`);
  }

  // Test 2: Export endpoint without auth
  try {
    const exportResult = await makeRequest('/api/edgar/export');
    console.log(`GET /api/edgar/export (no auth): ${exportResult.status}`);
    if (exportResult.status === 401 || exportResult.status === 403) {
      console.log('✅ Export endpoint correctly rejects unauthenticated requests\n');
    } else {
      console.log(`❌ Export endpoint should return 401/403, got ${exportResult.status}\n`);
    }
  } catch (e) {
    console.log(`ERROR testing export endpoint: ${e.message}\n`);
  }

  // Test 3: Health endpoint (should work)
  try {
    const healthResult = await makeRequest('/api/health');
    console.log(`GET /api/health: ${healthResult.status}`);
    if (healthResult.status === 200) {
      console.log('✅ Health endpoint works\n');
    }
  } catch (e) {
    console.log(`ERROR testing health endpoint: ${e.message}\n`);
  }
}

runTests().catch(console.error);
