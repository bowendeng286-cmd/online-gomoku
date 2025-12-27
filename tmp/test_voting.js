#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:5000/api/game';

async function testNewGameVoting() {
  console.log('🧪 测试新游戏投票系统...\n');

  try {
    // Step 1: 创建房间
    console.log('1️⃣ 创建房间（黑方）...');
    const createResponse = await makeRequest('POST', {
      action: 'create_room',
      customRoomId: 'VOTETEST',
      firstPlayer: 'black'
    });
    
    if (createResponse.type !== 'room_info') {
      throw new Error('创建房间失败');
    }
    console.log('✅ 房间创建成功');

    // Step 2: 白方加入
    console.log('\n2️⃣ 白方加入房间...');
    const joinResponse = await makeRequest('POST', {
      action: 'join_room',
      roomId: 'VOTETEST'
    });
    
    if (joinResponse.type !== 'room_info') {
      throw new Error('加入房间失败');
    }
    console.log('✅ 白方加入成功');

    // Step 3: 测试游戏中的投票（应该失败）
    console.log('\n3️⃣ 测试游戏中的投票（应该被拒绝）...');
    try {
      await makeRequest('POST', {
        action: 'vote_new_game',
        roomId: 'VOTETEST'
      });
      console.log('❌ 意外成功！');
    } catch (error) {
      console.log('✅ 正确拒绝：游戏进行中无法投票');
    }

    // Step 4: 模拟游戏结束（直接设置为ended状态）
    console.log('\n4️⃣ 模拟游戏结束...');
    // 这里我们需要手动设置游戏状态为ended，因为API没有直接的方法
    // 让我们通过一个快速的五子棋序列来实现
    await simulateGameEnd('VOTETEST');

    // Step 5: 黑方投票
    console.log('\n5️⃣ 黑方投票开始新游戏...');
    const blackVoteResponse = await makeRequest('POST', {
      action: 'vote_new_game',
      roomId: 'VOTETEST'
    });
    
    if (blackVoteResponse.type === 'vote_recorded') {
      console.log('✅ 黑方投票成功');
      console.log(`   消息: ${blackVoteResponse.payload.message}`);
    }

    // Step 6: 检查投票状态
    console.log('\n6️⃣ 检查投票状态...');
    const pollResponse = await makeRequest('GET', null, 'VOTETEST');
    if (pollResponse.type === 'game_state_with_opponent') {
      const votes = pollResponse.payload.newGameVotes;
      console.log(`   黑方投票: ${votes.black ? '✅' : '⏳'}`);
      console.log(`   白方投票: ${votes.white ? '✅' : '⏳'}`);
    }

    // Step 7: 白方投票
    console.log('\n7️⃣ 白方投票开始新游戏...');
    const whiteVoteResponse = await makeRequest('POST', {
      action: 'vote_new_game',
      roomId: 'VOTETEST'
    });
    
    if (whiteVoteResponse.type === 'new_game_started') {
      console.log('✅ 双方投票完成，新游戏开始！');
      console.log(`   消息: ${whiteVoteResponse.payload.message}`);
      console.log(`   新的先手: ${whiteVoteResponse.payload.firstHand}`);
    }

    // Step 8: 检查最终状态
    console.log('\n8️⃣ 检查最终游戏状态...');
    const finalPoll = await makeRequest('GET', null, 'VOTETEST');
    if (finalPoll.type === 'game_state_with_opponent') {
      console.log(`   游戏状态: ${finalPoll.payload.gameState.status}`);
      console.log(`   当前回合: ${finalPoll.payload.gameState.currentTurn}`);
      console.log(`   投票状态已重置: ${!finalPoll.payload.newGameVotes.black && !finalPoll.payload.newGameVotes.white}`);
    }

    console.log('\n🎉 新游戏投票系统测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

async function simulateGameEnd(roomId) {
  // 快速创建一个五子棋获胜局面
  // 水平五连：黑方在第7行，第7-11列
  const moves = [
    { row: 7, col: 7 }, // 黑方
    { row: 6, col: 6 }, // 白方
    { row: 7, col: 8 }, // 黑方
    { row: 6, col: 7 }, // 白方
    { row: 7, col: 9 }, // 黑方
    { row: 6, col: 8 }, // 白方
    { row: 7, col: 10 }, // 黑方
    { row: 6, col: 9 }, // 白方
    { row: 7, col: 11 }, // 黑方（获胜）
  ];

  for (const move of moves) {
    await makeRequest('POST', {
      action: 'move',
      roomId: roomId,
      move: move
    });
  }
  
  console.log('✅ 游戏结束模拟完成（黑方获胜）');
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
testNewGameVoting();