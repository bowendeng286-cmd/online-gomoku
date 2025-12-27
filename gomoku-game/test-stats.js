const testStatsUpdate = async () => {
  try {
    // 1. 创建第二个用户
    const user2Response = await fetch('http://localhost:5000/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'testpass123'
      })
    });

    const user2Data = await user2Response.json();
    console.log('User 2 created:', user2Data);

    // 2. 创建房间
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExLCJpYXQiOjE3NjY4MjMyMDksImV4cCI6MTc2NzQyODAwOX0.-ooDnQF4j48ITe1sNfK5811M4dGXvt9hxZH95fYqOqI';
    
    const createRoomResponse = await fetch('http://localhost:5000/api/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'create_room',
        customRoomId: 'TEST123'
      })
    });

    const roomData = await createRoomResponse.json();
    console.log('Room created:', roomData);

    // 3. 第二个用户加入房间
    const user2Token = user2Data.token;
    const joinRoomResponse = await fetch('http://localhost:5000/api/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user2Token}`
      },
      body: JSON.stringify({
        action: 'join_room',
        roomId: 'TEST123'
      })
    });

    const joinData = await joinRoomResponse.json();
    console.log('Joined room:', joinData);

    // 4. 模拟游戏结束 - 黑方获胜
    const endGameResponse = await fetch('http://localhost:5000/api/stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        roomId: 'TEST123',
        winner: 'black',
        blackPlayerId: 11,
        whitePlayerId: user2Data.user.id
      })
    });

    const endGameData = await endGameResponse.json();
    console.log('Game ended:', endGameData);

    // 5. 检查更新后的统计
    const statsResponse = await fetch('http://localhost:5000/api/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const statsData = await statsResponse.json();
    console.log('Updated stats:', statsData);

  } catch (error) {
    console.error('Test error:', error);
  }
};

testStatsUpdate();