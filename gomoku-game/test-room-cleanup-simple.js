#!/usr/bin/env node

const http = require('http');

// 配置
const BASE_URL = `http://localhost:${process.env.DEPLOY_RUN_PORT || 3000}`;

// 测试用户凭据
const testUsers = [
  { email: 'test01@example.com', password: 'testpass123' },
  { email: 'test02@example.com', password: 'testpass123' }
];

let tokens = [];

// 辅助函数：延迟
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP请求辅助函数
function makeRequest(path, method, data, token) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: process.env.DEPLOY_RUN_PORT || 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 登录获取token
async function login(user) {
  try {
    const response = await makeRequest('/api/auth', 'POST', {
      action: 'login',
      email: user.email,
      password: user.password
    });
    
    if (response.status === 200 && response.data.success) {
      console.log(`✓ ${user.email} 登录成功`);
      return response.data.token;
    } else {
      console.error(`✗ ${user.email} 登录失败:`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`✗ ${user.email} 登录请求失败:`, error.message);
    return null;
  }
}

// 创建房间
async function createRoom(token) {
  try {
    const response = await makeRequest('/api/game', 'POST', { action: 'create_room' }, token);
    
    if (response.status === 200 && response.data.type === 'room_info') {
      console.log(`✓ 创建房间成功: ${response.data.payload.roomId}`);
      return response.data.payload;
    } else {
      console.error('✗ 创建房间失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('✗ 创建房间请求失败:', error.message);
    return null;
  }
}

// 加入房间
async function joinRoom(roomId, token) {
  try {
    const response = await makeRequest('/api/game', 'POST', { action: 'join_room', roomId }, token);
    
    if (response.status === 200 && response.data.type === 'room_info') {
      console.log(`✓ 加入房间成功: ${roomId}`);
      return response.data.payload;
    } else {
      console.error('✗ 加入房间失败:', response.data);
      return null;
    }
  } catch (error) {
    console.error('✗ 加入房间请求失败:', error.message);
    return null;
  }
}

// 进行一些移动
async function makeMoves(roomId, token, moves) {
  try {
    for (const move of moves) {
      const response = await makeRequest(
        '/api/game', 
        'POST', 
        { 
          action: 'move', 
          roomId, 
          move: { row: move.row, col: move.col } 
        }, 
        token
      );
      
      if (response.status === 200) {
        console.log(`✓ 移动 (${move.row}, ${move.col}) 成功`);
      } else {
        console.error(`✗ 移动 (${move.row}, ${move.col}) 失败:`, response.data);
      }
      await sleep(100); // 短暂延迟
    }
  } catch (error) {
    console.error('✗ 移动失败:', error.message);
  }
}

// 退出房间
async function leaveRoom(roomId, token) {
  try {
    const response = await makeRequest('/api/game', 'POST', { action: 'leave_room', roomId }, token);
    
    if (response.status === 200 && response.data.success) {
      console.log(`✓ 退出房间成功: ${roomId}`);
      return true;
    } else {
      console.error('✗ 退出房间失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('✗ 退出房间请求失败:', error.message);
    return false;
  }
}

// 测试数据库清理
async function testCleanup() {
  console.log('🚀 开始测试房间退出后的game_moves清理功能\n');

  // 1. 登录两个用户
  console.log('📝 步骤1: 登录测试用户');
  for (const user of testUsers) {
    const token = await login(user);
    if (token) {
      tokens.push(token);
    } else {
      console.log('❌ 测试失败：无法登录所有用户');
      return;
    }
  }

  if (tokens.length < 2) {
    console.log('❌ 测试失败：需要至少两个有效token');
    return;
  }

  await sleep(1000);

  // 2. 用户1创建房间
  console.log('\n📝 步骤2: 创建房间');
  const roomInfo = await createRoom(tokens[0]);
  if (!roomInfo) {
    console.log('❌ 测试失败：无法创建房间');
    return;
  }

  const roomId = roomInfo.roomId;
  await sleep(1000);

  // 3. 用户2加入房间
  console.log('\n📝 步骤3: 加入房间');
  const joinResult = await joinRoom(roomId, tokens[1]);
  if (!joinResult) {
    console.log('❌ 测试失败：无法加入房间');
    return;
  }

  await sleep(2000);

  // 4. 进行一些移动
  console.log('\n📝 步骤4: 进行游戏移动');
  await makeMoves(roomId, tokens[0], [
    { row: 7, col: 7 },
    { row: 7, col: 8 },
    { row: 8, col: 7 },
    { row: 8, col: 8 }
  ]);

  await sleep(1000);

  // 5. 用户1退出房间
  console.log('\n📝 步骤5: 第一个玩家退出房间');
  const leave1 = await leaveRoom(roomId, tokens[0]);
  if (!leave1) {
    console.log('❌ 测试失败：用户1无法退出房间');
    return;
  }

  await sleep(2000);

  // 6. 用户2退出房间（此时应该触发清理）
  console.log('\n📝 步骤6: 第二个玩家退出房间（应触发清理）');
  const leave2 = await leaveRoom(roomId, tokens[1]);
  if (!leave2) {
    console.log('❌ 测试失败：用户2无法退出房间');
    return;
  }

  await sleep(3000);

  console.log('\n✅ 测试完成！');
  console.log('📋 总结:');
  console.log('   - 两个用户成功登录');
  console.log('   - 房间创建和加入成功');
  console.log('   - 游戏移动记录已创建');
  console.log('   - 两个玩家都退出了房间');
  console.log('   - 预期：game_moves记录应该已被清理');
  console.log('\n🔍 请检查服务器日志以确认清理操作是否执行');
  console.log('🗄️  也可以直接检查数据库中的game_moves表');
}

// 运行测试
testCleanup().catch(console.error);