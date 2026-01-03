// 测试gameStore功能的脚本
import { getGameStore } from './gameStore.js';

function testGameStore() {
  console.log('🧪 测试GameStore功能\n');

  const store = getGameStore();

  // 1. 创建房间
  console.log('1. 创建房间...');
  const room1 = store.createRoom('TEST001', 1, 100, 'black');
  console.log('✅ 房间创建成功:', room1.id);

  // 2. 加入房间
  console.log('\n2. 加入房间...');
  const joinSuccess = store.joinRoom('TEST001', 200);
  console.log(joinSuccess ? '✅ 加入房间成功' : '❌ 加入房间失败');

  // 3. 获取房间信息
  console.log('\n3. 获取房间信息...');
  const retrievedRoom = store.getRoom('TEST001');
  if (retrievedRoom) {
    console.log('✅ 房间信息获取成功');
    console.log('  - 黑方玩家:', retrievedRoom.players.black);
    console.log('  - 白方玩家:', retrievedRoom.players.white);
    console.log('  - 房间内玩家:', Array.from(retrievedRoom.playersInRoom));
  }

  // 4. 获取用户角色
  console.log('\n4. 获取用户角色...');
  const role1 = store.getPlayerRole('TEST001', 100);
  const role2 = store.getPlayerRole('TEST001', 200);
  console.log('  - 用户100角色:', role1);
  console.log('  - 用户200角色:', role2);

  // 5. 离开房间
  console.log('\n5. 离开房间...');
  const leaveRoomId = store.leaveRoom(100);
  console.log('用户100离开房间，结果:', leaveRoomId);

  // 检查房间状态
  const roomAfterLeave = store.getRoom('TEST001');
  if (roomAfterLeave) {
    console.log('  - 离开后房间内玩家:', Array.from(roomAfterLeave.playersInRoom));
    console.log('  - 黑方玩家:', roomAfterLeave.players.black);
    console.log('  - 白方玩家:', roomAfterLeave.players.white);
  }

  // 6. 第二个玩家离开（应该销毁房间）
  console.log('\n6. 第二个玩家离开...');
  const leaveRoomId2 = store.leaveRoom(200);
  console.log('用户200离开房间，结果:', leaveRoomId2);

  // 检查房间是否被销毁
  const roomAfterAllLeave = store.getRoom('TEST001');
  if (!roomAfterAllLeave) {
    console.log('✅ 房间已成功销毁');
  } else {
    console.log('❌ 房间未被销毁');
  }

  // 7. 测试统计信息
  console.log('\n7. 测试统计信息...');
  const stats = store.getRoomStats();
  console.log('房间统计:', stats);

  // 8. 测试匹配功能
  console.log('\n8. 测试匹配功能...');
  const matchId1 = store.addToMatchQueue(300);
  const matchId2 = store.addToMatchQueue(400);
  console.log('添加用户到匹配队列:', matchId1, matchId2);

  const matchedUser = store.findMatchForPlayer(300);
  console.log('找到匹配:', matchedUser);

  // 9. 清理测试
  console.log('\n9. 清理测试...');
  store.destroy();
  console.log('✅ GameStore已清理');

  console.log('\n🎉 所有测试完成！');
}

// 运行测试
if (typeof window === 'undefined') {
  // Node.js环境
  testGameStore();
}