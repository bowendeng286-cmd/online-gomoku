// Simple API test to verify stats calculation
const http = require('http');

const makeRequest = (options, data) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    
    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
};

const testAPI = async () => {
  try {
    const port = process.env.DEPLOY_RUN_PORT || 3000;
    
    // Test the basic auth endpoint
    console.log('Testing auth endpoint...');
    const authData = await makeRequest({
      hostname: 'localhost',
      port: port,
      path: '/api/auth',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      action: 'login',
      email: 'test@example.com',
      password: 'password123'
    }));
    
    console.log('Auth response:', authData);
    
    if (authData.success && authData.token) {
      // Test stats endpoint with valid token
      console.log('\nTesting stats endpoint...');
      const statsData = await makeRequest({
        hostname: 'localhost',
        port: port,
        path: '/api/stats',
        headers: {
          'Authorization': 'Bearer ' + authData.token
        }
      });
      
      console.log('Stats response:', JSON.stringify(statsData, null, 2));
      
      // Verify calculation
      if (statsData.gamesPlayed > 0) {
        const expectedWinRate = ((statsData.gamesWon / statsData.gamesPlayed) * 100).toFixed(2);
        const actualWinRate = statsData.winRate;
        console.log(`\n胜率验证: 期望 ${expectedWinRate}%, 实际 ${actualWinRate}%`);
        console.log(expectedWinRate == actualWinRate ? '✅ 计算正确' : '❌ 计算错误');
      }
    } else {
      console.log('Login failed, cannot test stats');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testAPI();