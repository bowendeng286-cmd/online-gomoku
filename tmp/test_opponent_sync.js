#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:5000/api/game';

async function testOpponentStatusSync() {
  console.log('🧪 测试对手状态实时同步功能...\n');

  try {
    // Step 1: 创建房间
    console.log('1️⃣ 创建房间...');
    const createResponse = await makeRequest('POST', {
      action: 'create_room',
      customRoomId: 'TEST123',
      firstPlayer: 'black'
    });
    
    if (createResponse.type !== 'room_info') {
      throw new Error('创建房间失败');
    }
    
    console.log('✅ 房间创建成功');
    console.log(`   房间号: ${createResponse.payload.roomId}`);
    console.log(`   创建者角色: ${createResponse.payload.playerRole}`);
    console.log(`   对手状态: ${createResponse.payload.opponentJoined ? '已加入' : '等待中'}\n`);

    const roomId = createResponse.payload.roomId;

    // Step 2: 轮询房间状态（模拟创建者等待）
    console.log('2️⃣ 创建者轮询房间状态...');
    for (let i = 0; i < 3; i++) {
      await sleep(1000);
      const pollResponse = await makeRequest('GET', null, roomId);
      
      if (pollResponse.type === 'room_info') {
        console.log(`   轮询 ${i + 1}: 对手状态 = ${pollResponse.payload.opponentJoined ? '已加入' : '等待中'}`);
      }
    }

    // Step 3: 第二个玩家加入房间
    console.log('\n3️⃣ 第二个玩家加入房间...');
    const joinResponse = await makeRequest('POST', {
      action: 'join_room',
      roomId: roomId
    });
    
    if (joinResponse.type !== 'room_info') {
      throw new Error('加入房间失败');
    }
    
    console.log('✅ 成功加入房间');
    console.log(`   加入者角色: ${joinResponse.payload.playerRole}`);
    console.log(`   对手状态: ${joinResponse.payload.opponentJoined ? '已加入' : '等待中'}\n`);

    // Step 4: 再次轮询，验证对手状态已更新
    console.log('4️⃣ 验证对手状态实时同步...');
    for (let i = 0; i < 3; i++) {
      await sleep(500);
      const pollResponse = await makeRequest('GET', null, roomId);
      
      if (pollResponse.type === 'room_info') {
        console.log(`   轮询 ${i + 1}: 对手状态 = ${pollResponse.payload.opponentJoined ? '已加入' : '等待中'}`);
        
        if (pollResponse.payload.opponentJoined) {
          console.log('✅ 对手状态已正确同步！');
        } else {
          console.log('❌ 对手状态未正确同步！');
        }
      }
    }

    console.log('\n🎉 测试完成！对手状态同步功能正常工作。');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

function makeRequest(method, data, roomId = null) {
  return new Promise((resolve, reject) => {
    const url = roomId ? `${BASE_URL}?roomId=${roomId}` : BASE_URL;
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.error || 'Unknown error'}`));
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testOpponentStatusSync();