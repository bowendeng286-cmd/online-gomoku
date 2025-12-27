// 简化的房间清理测试脚本
const API_BASE = 'http://localhost:' + (process.env.DEPLOY_RUN_PORT || '5000');

class SimpleRoomTest {
  async testRoomCleanup() {
    console.log('🧪 测试房间清理功能\n');

    // 1. 创建房间
    console.log('1. 创建测试房间...');
    const createResponse = await fetch(`${API_BASE}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // 这个会失败但会触发房间创建逻辑检查
      },
      body: JSON.stringify({
        action: 'create_room',
        customRoomId: 'TEST001'
      })
    });

    console.log('创建房间响应状态:', createResponse.status);

    // 2. 检查管理员API
    console.log('\n2. 检查房间统计...');
    try {
      const statsResponse = await fetch(`${API_BASE}/api/admin/rooms`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        console.log('✅ 管理员API可访问');
        console.log('房间统计:', stats.stats);
        console.log('活跃房间数:', stats.rooms?.length || 0);
      } else {
        console.log('❌ 管理员API不可访问 (状态:', statsResponse.status, ')');
      }
    } catch (error) {
      console.log('❌ 管理员API请求失败:', error.message);
    }

    // 3. 测试手动清理
    console.log('\n3. 测试手动清理...');
    try {
      const cleanupResponse = await fetch(`${API_BASE}/api/admin/rooms`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });
      
      if (cleanupResponse.ok) {
        const cleanup = await cleanupResponse.json();
        console.log('✅ 手动清理API可访问');
        console.log('清理结果:', cleanup.message);
      } else {
        console.log('❌ 手动清理API不可访问 (状态:', cleanupResponse.status, ')');
      }
    } catch (error) {
      console.log('❌ 手动清理API请求失败:', error.message);
    }

    console.log('\n🎉 基础功能测试完成！');
  }
}

// 检查服务状态
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

async function main() {
  console.log('🔍 检查服务状态...');
  const serviceAvailable = await checkService();
  
  if (!serviceAvailable) {
    console.log('❌ 服务不可用');
    process.exit(1);
  }

  console.log('✅ 服务可用');
  const test = new SimpleRoomTest();
  await test.testRoomCleanup();
}

main().catch(console.error);