// 测试房间销毁机制的脚本
const API_BASE = 'http://localhost:' + (process.env.DEPLOY_RUN_PORT || '5000');

// 测试用户凭据
const TEST_USERS = [
  { email: 'test1@example.com', password: 'password123', username: 'TestUser1' },
  { email: 'test2@example.com', password: 'password123', username: 'TestUser2' },
  { email: 'test3@example.com', password: 'password123', username: 'TestUser3' }
];

class RoomTest {
  constructor() {
    this.tokens = [];
    this.rooms = [];
  }

  async login(user) {
    console.log(`\n🔐 登录用户: ${user.username}`);
    
    const response = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email: user.email,
        password: user.password
      })
    });

    const data = await response.json();
    
    if (data.success) {
      this.tokens.push(data.token);
      console.log(`✅ ${user.username} 登录成功`);
      return data.token;
    } else {
      console.log(`❌ ${user.username} 登录失败: ${data.error}`);
      return null;
    }
  }

  async createRoom(token, customRoomId = null) {
    console.log('\n🏠 创建房间...');
    
    const response = await fetch(`${API_BASE}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'create_room',
        customRoomId,
        firstPlayer: 'black'
      })
    });

    const data = await response.json();
    
    if (data.type === 'room_info') {
      this.rooms.push(data.payload.roomId);
      console.log(`✅ 房间创建成功: ${data.payload.roomId}`);
      return data.payload;
    } else {
      console.log(`❌ 创建房间失败: ${data.error}`);
      return null;
    }
  }

  async joinRoom(token, roomId) {
    console.log(`\n🚪 加入房间: ${roomId}`);
    
    const response = await fetch(`${API_BASE}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'join_room',
        roomId
      })
    });

    const data = await response.json();
    
    if (data.type === 'room_info') {
      console.log(`✅ 加入房间成功`);
      return data.payload;
    } else {
      console.log(`❌ 加入房间失败: ${data.error}`);
      return null;
    }
  }

  async leaveRoom(token, roomId) {
    console.log(`\n🚶 离开房间: ${roomId}`);
    
    const response = await fetch(`${API_BASE}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'leave_room',
        roomId
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ 离开房间成功${data.destroyed ? ' (房间已销毁)' : ''}`);
      return data;
    } else {
      console.log(`❌ 离开房间失败: ${data.error}`);
      return null;
    }
  }

  async checkRoomStatus(token, roomId) {
    const response = await fetch(`${API_BASE}/api/game?roomId=${roomId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      return null; // 房间不存在或已被销毁
    }
  }

  async getRoomStats() {
    console.log('\n📊 获取房间统计信息...');
    
    const response = await fetch(`${API_BASE}/api/admin/rooms`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.tokens[0]}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`📈 房间统计:`, data.stats);
      console.log(`🏠 活跃房间数: ${data.rooms.length}`);
      data.rooms.forEach((room, index) => {
        console.log(`  ${index + 1}. 房间 ${room.id} - 状态: ${room.status}, 玩家: ${Array.from(room.playersInRoom || []).join(', ')}, 空闲时间: ${Math.round(room.idle / 1000)}s`);
      });
      return data;
    } else {
      console.log(`❌ 无法获取房间统计: ${response.status}`);
      return null;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testRoomDestruction() {
    console.log('🧪 开始测试房间销毁机制\n');

    // 1. 登录测试用户
    console.log('=' .repeat(50));
    console.log('第1步: 登录测试用户');
    console.log('=' .repeat(50));

    const token1 = await this.login(TEST_USERS[0]);
    const token2 = await this.login(TEST_USERS[1]);

    if (!token1 || !token2) {
      console.log('❌ 无法完成测试: 用户登录失败');
      return;
    }

    // 2. 创建房间并加入
    console.log('\n' + '=' .repeat(50));
    console.log('第2步: 创建房间并测试基础功能');
    console.log('=' .repeat(50));

    const room1 = await this.createRoom(token1, 'TEST01');
    if (!room1) return;

    const joinResult = await this.joinRoom(token2, room1.roomId);
    if (!joinResult) return;

    // 获取初始房间状态
    await this.getRoomStats();

    // 3. 测试玩家离开但房间不销毁（还有其他玩家）
    console.log('\n' + '=' .repeat(50));
    console.log('第3步: 测试单个玩家离开（房间不销毁）');
    console.log('=' .repeat(50));

    await this.leaveRoom(token1, room1.roomId);
    await this.sleep(1000);

    // 检查房间状态
    const statusAfterLeave = await this.checkRoomStatus(token2, room1.roomId);
    if (statusAfterLeave) {
      console.log('✅ 房间仍然存在（还有其他玩家）');
    } else {
      console.log('❌ 房间意外消失');
    }

    await this.getRoomStats();

    // 4. 测试所有玩家离开后房间销毁
    console.log('\n' + '=' .repeat(50));
    console.log('第4步: 测试所有玩家离开（房间应该销毁）');
    console.log('=' .repeat(50));

    await this.leaveRoom(token2, room1.roomId);
    await this.sleep(2000);

    // 检查房间是否被销毁
    const statusAfterAllLeave = await this.checkRoomStatus(token1, room1.roomId);
    if (!statusAfterAllLeave) {
      console.log('✅ 房间已成功销毁（所有玩家离开）');
    } else {
      console.log('❌ 房间未按预期销毁');
    }

    await this.getRoomStats();

    // 5. 测试空房间超时销毁
    console.log('\n' + '=' .repeat(50));
    console.log('第5步: 测试空房间超时销毁');
    console.log('=' .repeat(50));

    const token3 = await this.login(TEST_USERS[2]);
    if (!token3) return;

    const room2 = await this.createRoom(token3, 'TIMEOUT');
    if (!room2) return;

    console.log('⏰ 等待35秒，观察空房间超时销毁...');
    await this.sleep(35000);

    const statusAfterTimeout = await this.checkRoomStatus(token3, room2.roomId);
    if (!statusAfterTimeout) {
      console.log('✅ 空房间已按超时机制销毁');
    } else {
      console.log('⚠️  空房间尚未销毁（可能需要更长时间）');
    }

    await this.getRoomStats();

    // 6. 测试手动清理
    console.log('\n' + '=' .repeat(50));
    console.log('第6步: 测试管理员手动清理');
    console.log('=' .repeat(50));

    const cleanupResponse = await fetch(`${API_BASE}/api/admin/rooms`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.tokens[0]}`
      }
    });

    if (cleanupResponse.ok) {
      const cleanupData = await cleanupResponse.json();
      console.log(`✅ 手动清理完成: ${cleanupData.message}`);
      console.log(`🧹 清理了 ${cleanupData.cleanedUp} 个房间`);
    } else {
      console.log(`❌ 手动清理失败: ${cleanupResponse.status}`);
    }

    await this.getRoomStats();

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 房间销毁测试完成！');
    console.log('=' .repeat(50));
  }
}

// 运行测试
async function runTest() {
  const test = new RoomTest();
  await test.testRoomDestruction();
}

// 检查服务是否可用
async function checkService() {
  try {
    const response = await fetch(`${API_BASE}/api/game`, {
      method: 'GET'
    });
    return response.status !== 500;
  } catch {
    return false;
  }
}

// 主函数
async function main() {
  console.log('🔍 检查服务状态...');
  const serviceAvailable = await checkService();
  
  if (!serviceAvailable) {
    console.log('❌ 服务不可用，请确保游戏服务正在运行在 localhost:3000');
    process.exit(1);
  }

  console.log('✅ 服务可用，开始测试...\n');
  await runTest();
}

main().catch(console.error);