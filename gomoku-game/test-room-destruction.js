#!/usr/bin/env node

/**
 * 房间销毁机制测试脚本
 * 测试场景：
 * 1. 创建房间并加入两个玩家
 * 2. 模拟游戏结束
 * 3. 测试双方玩家离开后房间是否被销毁
 */

const https = require('https');
const http = require('http');

// 配置
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER1 = {
  username: 'testuser1',
  email: 'test1@example.com',
  password: 'password123'
};
const TEST_USER2 = {
  username: 'testuser2', 
  email: 'test2@example.com',
  password: 'password123'
};

let user1Token = null;
let user2Token = null;
let roomId = null;

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

// 测试步骤
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerAndLogin(user) {
  try {
    // 尝试注册（可能已存在）
    await makeRequest('/api/auth', 'POST', {
      action: 'register',
      username: user.username,
      email: user.email,
      password: user.password
    });
  } catch (e) {
    console.log(`用户 ${user.username} 可能已存在，继续登录`);
  }
  
  // 登录
  const response = await makeRequest('/api/auth', 'POST', {
    action: 'login',
    email: user.email,
    password: user.password
  });
  
  if (response.status !== 200) {
    throw new Error(`登录失败: ${JSON.stringify(response.data)}`);
  }
  
  return response.data.token;
}

async function createRoom(token) {
  const response = await makeRequest('/api/game', 'POST', {
    action: 'create_room',
    customRoomId: 'TEST-DESTROY'
  }, token);
  
  if (response.status !== 200) {
    throw new Error(`创建房间失败: ${JSON.stringify(response.data)}`);
  }
  
  return response.data.payload.roomId;
}

async function joinRoom(roomId, token) {
  const response = await makeRequest('/api/game', 'POST', {
    action: 'join_room',
    roomId: roomId
  }, token);
  
  if (response.status !== 200) {
    throw new Error(`加入房间失败: ${JSON.stringify(response.data)}`);
  }
  
  return response.data;
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

async function forceCleanup(token) {
  const response = await makeRequest('/api/admin/rooms', 'POST', {
    action: 'cleanup'
  }, token);
  return response;
}

async function testRoomDestruction() {
  console.log('开始测试房间销毁机制...');
  
  try {
    // 1. 注册并登录测试用户
    console.log('1. 注册并登录测试用户...');
    user1Token = await registerAndLogin(TEST_USER1);
    user2Token = await registerAndLogin(TEST_USER2);
    console.log('用户登录成功');
    
    // 2. 创建房间
    console.log('2. 创建测试房间...');
    roomId = await createRoom(user1Token);
    console.log(`房间创建成功: ${roomId}`);
    
    // 3. 第二个用户加入房间
    console.log('3. 第二个用户加入房间...');
    await joinRoom(roomId, user2Token);
    console.log('第二个用户加入成功');
    
    // 4. 检查房间状态
    console.log('4. 检查房间状态...');
    let roomExists = await checkRoomExists(roomId, user1Token);
    console.log(`房间存在: ${roomExists}`);
    
    // 获取房间统计
    const stats = await getRoomStats(user1Token);
    if (stats) {
      console.log(`当前房间统计: 总房间数=${stats.totalRooms}, 活跃房间数=${stats.activeRooms}, 总玩家数=${stats.totalPlayers}`);
    }
    
    // 5. 模拟一些移动来模拟游戏
    console.log('5. 模拟游戏移动...');
    await makeRequest('/api/game', 'POST', {
      action: 'move',
      roomId: roomId,
      move: { row: 7, col: 7 }
    }, user1Token);
    
    await sleep(500);
    
    await makeRequest('/api/game', 'POST', {
      action: 'move',
      roomId: roomId,
      move: { row: 7, col: 8 }
    }, user2Token);
    
    console.log('游戏移动完成');
    
    // 6. 第一个用户离开房间
    console.log('6. 第一个用户离开房间...');
    const leave1Response = await makeRequest('/api/game', 'POST', {
      action: 'leave_room',
      roomId: roomId
    }, user1Token);
    
    console.log(`用户1离开响应: ${JSON.stringify(leave1Response.data)}`);
    await sleep(1000);
    
    // 7. 检查房间是否还存在
    console.log('7. 检查用户1离开后房间状态...');
    roomExists = await checkRoomExists(roomId, user2Token);
    console.log(`房间仍然存在: ${roomExists}`);
    
    // 8. 第二个用户离开房间
    console.log('8. 第二个用户离开房间...');
    const leave2Response = await makeRequest('/api/game', 'POST', {
      action: 'leave_room',
      roomId: roomId
    }, user2Token);
    
    console.log(`用户2离开响应: ${JSON.stringify(leave2Response.data)}`);
    await sleep(2000);
    
    // 9. 检查房间是否被销毁
    console.log('9. 检查房间是否被销毁...');
    roomExists = await checkRoomExists(roomId, user1Token);
    console.log(`房间存在: ${roomExists} (应该是 false)`);
    
    // 10. 强制清理并检查统计
    console.log('10. 执行强制清理...');
    const cleanupResponse = await forceCleanup(user1Token);
    console.log(`清理响应: ${JSON.stringify(cleanupResponse.data)}`);
    
    await sleep(1000);
    
    // 11. 最终检查房间统计
    console.log('11. 最终房间统计...');
    const finalStats = await getRoomStats(user1Token);
    if (finalStats) {
      console.log(`最终房间统计: 总房间数=${finalStats.totalRooms}, 活跃房间数=${finalStats.activeRooms}, 总玩家数=${finalStats.totalPlayers}`);
    }
    
    // 测试结果
    if (!roomExists) {
      console.log('✅ 测试通过: 房间已被正确销毁');
    } else {
      console.log('❌ 测试失败: 房间未被销毁');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testRoomDestruction().then(() => {
  console.log('房间销毁测试完成');
  process.exit(0);
}).catch((error) => {
  console.error('测试失败:', error);
  process.exit(1);
});