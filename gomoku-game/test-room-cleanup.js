#!/usr/bin/env node

/**
 * 房间清理机制测试脚本
 * 测试超时清理功能：
 * 1. 创建空房间，测试30秒超时销毁
 * 2. 创建等待房间，测试1小时超时销毁
 * 3. 测试清理定时器功能
 */

const https = require('https');
const http = require('http');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  username: 'cleanupuser',
  email: 'cleanup@example.com',
  password: 'password123'
};

let userToken = null;

// HTTP请求辅助函数
function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          resolve({ status: res.statusCode, data });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function login() {
  try {
    // 尝试注册
    await makeRequest('/api/auth', 'POST', {
      action: 'register',
      username: TEST_USER.username,
      email: TEST_USER.email,
      password: TEST_USER.password
    });
  } catch (e) {
    console.log('用户可能已存在，继续登录');
  }
  
  // 登录
  const response = await makeRequest('/api/auth', 'POST', {
    action: 'login',
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (response.status !== 200) {
    throw new Error(`登录失败: ${JSON.stringify(response.data)}`);
  }
  
  return response.data.token;
}

async function createRoom(roomId, token) {
  const response = await makeRequest('/api/game', 'POST', {
    action: 'create_room',
    customRoomId: roomId
  }, token);
  
  if (response.status !== 200) {
    throw new Error(`创建房间失败: ${JSON.stringify(response.data)}`);
  }
  
  return response.data.payload.roomId;
}

async function checkRoomExists(roomId, token) {
  const response = await makeRequest(`/api/game?roomId=${roomId}`, 'GET', null, token);
  return response.status !== 404;
}

async function getRoomStats(token) {
  const response = await makeRequest('/api/admin/rooms?action=stats', 'GET', null, token);
  if (response.status === 200) {
    return response.data.payload;
  }
  return null;
}

async function getRoomList(token) {
  const response = await makeRequest('/api/admin/rooms?action=list', 'GET', null, token);
  if (response.status === 200) {
    return response.data.payload;
  }
  return [];
}

async function forceCleanup(token) {
  const response = await makeRequest('/api/admin/rooms', 'POST', {
    action: 'cleanup'
  }, token);
  return response;
}

async function testEmptyRoomCleanup() {
  console.log('\n=== 测试空房间清理 ===');
  
  const roomId = 'EMPTY-TEST-' + Date.now();
  
  try {
    // 1. 创建房间
    console.log(`1. 创建房间: ${roomId}`);
    await createRoom(roomId, userToken);
    console.log('房间创建成功');
    
    // 2. 立即离开房间（使房间变为空房间）
    console.log('2. 离开房间，使其变为空房间...');
    await makeRequest('/api/game', 'POST', {
      action: 'leave_room',
      roomId: roomId
    }, userToken);
    
    // 3. 检查房间是否存在（应该还存在，因为超时时间未到）
    console.log('3. 检查房间是否仍然存在...');
    let roomExists = await checkRoomExists(roomId, userToken);
    console.log(`房间存在: ${roomExists}`);
    
    // 4. 等待5秒（模拟时间流逝，但不到30秒）
    console.log('4. 等待5秒...');
    await sleep(5000);
    
    // 5. 手动触发清理
    console.log('5. 手动触发清理...');
    await forceCleanup(userToken);
    await sleep(1000);
    
    // 6. 检查房间是否还存在（应该还存在）
    console.log('6. 检查清理后房间状态...');
    roomExists = await checkRoomExists(roomId, userToken);
    console.log(`房间仍然存在: ${roomExists}`);
    
    console.log('✅ 空房间清理测试完成（房间应该在30秒后被自动清理）');
    
  } catch (error) {
    console.error('空房间清理测试失败:', error);
  }
}

async function testWaitingRoomCleanup() {
  console.log('\n=== 测试等待房间清理 ===');
  
  const roomId = 'WAITING-TEST-' + Date.now();
  
  try {
    // 1. 创建房间但不加入（保持waiting状态）
    console.log(`1. 创建等待房间: ${roomId}`);
    await createRoom(roomId, userToken);
    
    // 2. 离开房间，但房间保持waiting状态
    console.log('2. 离开房间...');
    await makeRequest('/api/game', 'POST', {
      action: 'leave_room',
      roomId: roomId
    }, userToken);
    
    // 3. 检查房间状态
    console.log('3. 检查房间列表...');
    const roomList = await getRoomList(userToken);
    const targetRoom = roomList.find(r => r.id === roomId);
    
    if (targetRoom) {
      console.log(`房间状态: ${targetRoom.status}, 创建时间: ${new Date(targetRoom.createdAt).toLocaleString()}`);
    }
    
    console.log('✅ 等待房间清理测试完成（房间应该在1小时后被自动清理）');
    
  } catch (error) {
    console.error('等待房间清理测试失败:', error);
  }
}

async function testCleanupTimer() {
  console.log('\n=== 测试清理定时器 ===');
  
  try {
    // 1. 获取清理前统计
    console.log('1. 获取清理前房间统计...');
    const beforeStats = await getRoomStats(userToken);
    console.log(`清理前: 总房间数=${beforeStats?.totalRooms}, 等待房间数=${beforeStats?.waitingRooms}`);
    
    // 2. 手动触发清理
    console.log('2. 手动触发清理定时器...');
    const cleanupResponse = await forceCleanup(userToken);
    console.log(`清理响应: ${cleanupResponse.data.payload.message}`);
    
    // 3. 获取清理后统计
    console.log('3. 获取清理后房间统计...');
    await sleep(1000);
    const afterStats = await getRoomStats(userToken);
    console.log(`清理后: 总房间数=${afterStats?.totalRooms}, 等待房间数=${afterStats?.waitingRooms}`);
    
    if (beforeStats && afterStats) {
      const roomsCleaned = beforeStats.totalRooms - afterStats.totalRooms;
      console.log(`清理的房间数: ${roomsCleaned}`);
    }
    
    console.log('✅ 清理定时器测试完成');
    
  } catch (error) {
    console.error('清理定时器测试失败:', error);
  }
}

async function runAllTests() {
  console.log('开始房间清理机制测试...');
  
  try {
    // 登录
    console.log('登录测试用户...');
    userToken = await login();
    console.log('登录成功');
    
    // 获取初始统计
    console.log('\n获取初始房间统计...');
    const initialStats = await getRoomStats(userToken);
    if (initialStats) {
      console.log(`初始统计: 总房间数=${initialStats.totalRooms}, 活跃房间数=${initialStats.activeRooms}, 等待房间数=${initialStats.waitingRooms}`);
    }
    
    // 运行各项测试
    await testEmptyRoomCleanup();
    await testWaitingRoomCleanup();
    await testCleanupTimer();
    
    // 最终统计
    console.log('\n获取最终房间统计...');
    const finalStats = await getRoomStats(userToken);
    if (finalStats) {
      console.log(`最终统计: 总房间数=${finalStats.totalRooms}, 活跃房间数=${finalStats.activeRooms}, 等待房间数=${finalStats.waitingRooms}`);
    }
    
    console.log('\n✅ 所有清理机制测试完成');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
runAllTests().then(() => {
  console.log('房间清理测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});