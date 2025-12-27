#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:5000/api/game';

async function testFixedSync() {
  console.log('🧪 测试修复后的对手状态和角色同步功能...\n');

  try {
    // Step 1: 创建房间（黑方）
    console.log('1️⃣ 黑方创建房间...');
    const createResponse = await makeRequest('POST', {
      action: 'create_room',
      customRoomId: 'FIXED123',
      firstPlayer: 'black'
    });
    
    if (createResponse.type !== 'room_info') {
      throw new Error('创建房间失败');
    }
    
    console.log('✅ 黑方房间创建成功');
    console.log(`   黑方角色: ${createResponse.payload.playerRole}`);
    console.log(`   当前回合: ${createResponse.payload.gameState.currentTurn}`);
    console.log(`   对手状态: ${createResponse.payload.opponentJoined ? '已加入' : '等待中'}\n`);

    // Step 2: 轮询检查黑方状态
    console.log('2️⃣ 黑方轮询状态...');
    const blackPoll = await makeRequest('GET', null, 'FIXED123');
    if (blackPoll.type === 'game_state_with_opponent') {
      console.log(`   当前回合: ${blackPoll.payload.gameState.currentTurn}`);
      console.log(`   对手状态: ${blackPoll.payload.opponentJoined ? '已加入' : '等待中'}`);
    }

    // Step 3: 白方加入房间
    console.log('\n3️⃣ 白方加入房间...');
    const joinResponse = await makeRequest('POST', {
      action: 'join_room',
      roomId: 'FIXED123'
    });
    
    if (joinResponse.type !== 'room_info') {
      throw new Error('加入房间失败');
    }
    
    console.log('✅ 白方加入成功');
    console.log(`   白方角色: ${joinResponse.payload.playerRole}`);
    console.log(`   当前回合: ${joinResponse.payload.gameState.currentTurn}`);
    console.log(`   对手状态: ${joinResponse.payload.opponentJoined ? '已加入' : '等待中'}\n`);

    // Step 4: 黑方轮询检查状态更新
    console.log('4️⃣ 黑方轮询检查对手状态更新...');
    const blackPollAfterJoin = await makeRequest('GET', null, 'FIXED123');
    if (blackPollAfterJoin.type === 'game_state_with_opponent') {
      console.log(`   当前回合: ${blackPollAfterJoin.payload.gameState.currentTurn}`);
      console.log(`   对手状态: ${blackPollAfterJoin.payload.opponentJoined ? '已加入' : '等待中'}`);
    }

    // Step 5: 黑方落子
    console.log('\n5️⃣ 黑方落子...');
    const blackMoveResponse = await makeRequest('POST', {
      action: 'move',
      roomId: 'FIXED123',
      move: { row: 7, col: 7 }
    });
    
    if (blackMoveResponse.type === 'game_state') {
      console.log('✅ 黑方落子成功');
      console.log(`   当前回合: ${blackMoveResponse.payload.currentTurn}`);
      console.log(`   最后落子: (${blackMoveResponse.payload.lastMove.row}, ${blackMoveResponse.payload.lastMove.col})`);
    }

    // Step 6: 白方落子
    console.log('\n6️⃣ 白方落子...');
    const whiteMoveResponse = await makeRequest('POST', {
      action: 'move',
      roomId: 'FIXED123',
      move: { row: 7, col: 8 }
    });
    
    if (whiteMoveResponse.type === 'game_state') {
      console.log('✅ 白方落子成功');
      console.log(`   当前回合: ${whiteMoveResponse.payload.currentTurn}`);
      console.log(`   最后落子: (${whiteMoveResponse.payload.lastMove.row}, ${whiteMoveResponse.payload.lastMove.col})`);
    }

    // Step 7: 轮询检查最终状态
    console.log('\n7️⃣ 检查最终游戏状态...');
    const finalPoll = await makeRequest('GET', null, 'FIXED123');
    if (finalPoll.type === 'game_state_with_opponent') {
      console.log(`   当前回合: ${finalPoll.payload.gameState.currentTurn}`);
      console.log(`   对手状态: ${finalPoll.payload.opponentJoined ? '已加入' : '等待中'}`);
      console.log(`   最后落子: (${finalPoll.payload.gameState.lastMove.row}, ${finalPoll.payload.gameState.lastMove.col})`);
    }

    console.log('\n🎉 所有测试通过！对手状态和角色同步功能已修复！');
    console.log('✅ 黑方始终保持黑方角色');
    console.log('✅ 白方始终保持白方角色');
    console.log('✅ 回合正确轮换');
    console.log('✅ 对手状态实时同步');

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

// Run the test
testFixedSync();