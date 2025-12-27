// Test script for ELO rating functionality
// This script tests the ELO calculation and stats API

const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test ELO calculation
function testEloCalculation() {
  console.log('\n=== Testing ELO Calculation ===');
  
  // Test case 1: Equal ratings (1200 vs 1200)
  const winnerRating1 = 1200;
  const loserRating1 = 1200;
  const expectedWinner1 = 1 / (1 + Math.pow(10, (loserRating1 - winnerRating1) / 400));
  const expectedLoser1 = 1 / (1 + Math.pow(10, (winnerRating1 - loserRating1) / 400));
  const K = 32;
  const winnerChange1 = Math.round(K * (1 - expectedWinner1));
  const loserChange1 = Math.round(K * (0 - expectedLoser1));
  
  console.log(`Test 1 - Equal ratings (${winnerRating1} vs ${loserRating1}):`);
  console.log(`  Expected scores: Winner=${expectedWinner1.toFixed(3)}, Loser=${expectedLoser1.toFixed(3)}`);
  console.log(`  Rating changes: Winner=${winnerChange1}, Loser=${loserChange1}`);
  
  // Test case 2: Higher rated player wins (1500 vs 1200)
  const winnerRating2 = 1500;
  const loserRating2 = 1200;
  const expectedWinner2 = 1 / (1 + Math.pow(10, (loserRating2 - winnerRating2) / 400));
  const expectedLoser2 = 1 / (1 + Math.pow(10, (winnerRating2 - loserRating2) / 400));
  const winnerChange2 = Math.round(K * (1 - expectedWinner2));
  const loserChange2 = Math.round(K * (0 - expectedLoser2));
  
  console.log(`\nTest 2 - Higher rated wins (${winnerRating2} vs ${loserRating2}):`);
  console.log(`  Expected scores: Winner=${expectedWinner2.toFixed(3)}, Loser=${expectedLoser2.toFixed(3)}`);
  console.log(`  Rating changes: Winner=${winnerChange2}, Loser=${loserChange2}`);
  
  // Test case 3: Upset win (1200 vs 1500)
  const winnerRating3 = 1200;
  const loserRating3 = 1500;
  const expectedWinner3 = 1 / (1 + Math.pow(10, (loserRating3 - winnerRating3) / 400));
  const expectedLoser3 = 1 / (1 + Math.pow(10, (winnerRating3 - loserRating3) / 400));
  const winnerChange3 = Math.round(K * (1 - expectedWinner3));
  const loserChange3 = Math.round(K * (0 - expectedLoser3));
  
  console.log(`\nTest 3 - Upset win (${winnerRating3} vs ${loserRating3}):`);
  console.log(`  Expected scores: Winner=${expectedWinner3.toFixed(3)}, Loser=${expectedLoser3.toFixed(3)}`);
  console.log(`  Rating changes: Winner=${winnerChange3}, Loser=${loserChange3}`);
  
  console.log('\n✅ ELO calculation tests completed');
}

// Test API endpoints (requires server to be running)
async function testAPI(token) {
  console.log('\n=== Testing API Endpoints ===');
  
  try {
    // Test stats endpoint
    console.log('Testing GET /api/stats...');
    const statsOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const statsResponse = await makeRequest(statsOptions);
    console.log(`Stats API Status: ${statsResponse.status}`);
    if (statsResponse.status === 200) {
      console.log('User stats:', JSON.stringify(statsResponse.data, null, 2));
    } else {
      console.log('Stats error:', statsResponse.data);
    }
    
    // Test reset stats endpoint
    console.log('\nTesting POST /api/test-stats (reset)...');
    const resetOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/test-stats',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const resetResponse = await makeRequest(resetOptions, { action: 'reset_stats' });
    console.log(`Reset API Status: ${resetResponse.status}`);
    console.log('Reset response:', resetResponse.data);
    
    // Test add test game
    console.log('\nTesting POST /api/test-stats (add game)...');
    const addGameResponse = await makeRequest(resetOptions, { action: 'add_test_game', result: 'win' });
    console.log(`Add game API Status: ${addGameResponse.status}`);
    console.log('Add game response:', addGameResponse.data);
    
    // Check stats again
    console.log('\nChecking updated stats...');
    const updatedStatsResponse = await makeRequest(statsOptions);
    if (updatedStatsResponse.status === 200) {
      console.log('Updated user stats:', JSON.stringify(updatedStatsResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('API test error:', error.message);
    console.log('Make sure the server is running on localhost:3000');
  }
}

// Main test function
async function runTests() {
  console.log('🎮 ELO Rating System Test Suite');
  console.log('================================');
  
  // Test ELO calculation logic
  testEloCalculation();
  
  // Ask if user wants to test API
  rl.question('\nDo you want to test the API endpoints? (server must be running) [y/N]: ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      rl.question('Enter your JWT token (from browser localStorage): ', (token) => {
        if (token) {
          testAPI(token).then(() => {
            console.log('\n✅ All tests completed!');
            rl.close();
          });
        } else {
          console.log('❌ No token provided. Skipping API tests.');
          rl.close();
        }
      });
    } else {
      console.log('\n✅ ELO calculation tests completed. API tests skipped.');
      rl.close();
    }
  });
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { testEloCalculation, testAPI };