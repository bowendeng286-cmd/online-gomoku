#!/usr/bin/env node

const http = require('http');

// 配置
const BASE_URL = `http://localhost:${process.env.DEPLOY_RUN_PORT || 3000}`;

// 测试用户凭据
const testUsers = [
  { username: 'testuser01', email: 'test01@example.com', password: 'testpass123' },
  { username: 'testuser02', email: 'test02@example.com', password: 'testpass123' },
  { username: 'testuser03', email: 'test03@example.com', password: 'testpass123' }
];

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

// 进行移动
async function makeMove(roomId, token, row, col) {
  try {
    const response = await makeRequest(
      '/api/game', 
      'POST', 
      { 
        action: 'move', 
        roomId, 
        move: { row, col } 
      }, 
      token
    );
    
    if (response.status === 200) {
      console.log(`✓ 移动 (${row}, ${col}) 成功`);
      return true;
    } else {
      console.log(`ℹ️  移动 (${row}, ${col}) 被拒绝:`, response.data.error || 'Unknown error');
      return false;
    }
  } catch (error) {
    console.error(`✗ 移动 (${row}, ${col}) 失败:`, error.message);
    return false;
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

// 测试场景1：两人游戏，双方都退出
async function testScenario1() {
  console.log('\n🎮 测试场景1: 两人游戏，双方都退出');
  
  // 登录两个用户
  const token1 = await login(testUsers[0]);
  const token2 = await login(testUsers[1]);
  
  if (!token1 || !token2) {
    console.log('❌ 无法登录用户，跳过此场景');
    return;
  }
  
  // 创建房间
  const roomInfo = await createRoom(token1);
  if (!roomInfo) return;
  
  const roomId = roomInfo.roomId;
  
  // 用户2加入房间（使用polling方式）
  console.log('ℹ️  等待用户2加入房间...');
  await sleep(1000);
  
  // 模拟用户2加入（这里简化处理，直接加入）
  try {
    await makeRequest('/api/game', 'POST', { action: 'join_room', roomId }, token2);
  } catch (error) {
    console.log('ℹ️  用户2加入失败，继续测试...');
  }
  
  await sleep(2000);
  
  // 进行一些移动
  console.log('📍 进行游戏移动...');
  await makeMove(roomId, token1, 7, 7);
  await sleep(200);
  await makeMove(roomId, token2, 7, 8);
  await sleep(200);
  await makeMove(roomId, token1, 8, 7);
  
  // 用户1退出
  console.log('🚪 用户1退出房间...');
  await leaveRoom(roomId, token1);
  await sleep(2000);
  
  // 用户2退出（应该触发清理）
  console.log('🚪 用户2退出房间（应触发清理）...');
  await leaveRoom(roomId, token2);
  await sleep(3000);
  
  console.log('✅ 场景1测试完成');
}

// 测试场景2：单人创建房间后直接退出
async function testScenario2() {
  console.log('\n🎮 测试场景2: 单人创建房间后直接退出');
  
  // 登录用户
  const token = await login(testUsers[2]);
  if (!token) {
    console.log('❌ 无法登录用户，跳过此场景');
    return;
  }
  
  // 创建房间
  const roomInfo = await createRoom(token);
  if (!roomInfo) return;
  
  const roomId = roomInfo.roomId;
  
  // 直接退出（应该触发清理，因为只有一人）
  console.log('🚪 用户退出房间（应触发清理）...');
  await leaveRoom(roomId, token);
  await sleep(3000);
  
  console.log('✅ 场景2测试完成');
}

// 辅助函数：延迟
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行所有测试场景
async function runAllTests() {
  console.log('🚀 开始测试game_moves清理功能的各种场景\n');
  
  await testScenario1();
  await sleep(2000);
  
  await testScenario2();
  
  console.log('\n✅ 所有测试场景完成！');
  console.log('\n📋 测试总结:');
  console.log('   - 场景1: 两人游戏的完整退出流程');
  console.log('   - 场景2: 单人房间的立即清理');
  console.log('\n🔍 请检查服务器日志确认清理操作是否正确执行');
  console.log('   - 查找 "All players have left room" 消息');
  console.log('   - 查找 "Deleted game moves" 消息');
}

// 运行测试
runAllTests().catch(console.error);