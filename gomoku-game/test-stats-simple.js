const testStatsUpdate = async () => {
  try {
    // 直接模拟游戏结束统计更新
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExLCJpYXQiOjE3NjY4MjMyMDksImV4cCI6MTc2NzQyODAwOX0.-ooDnQF4j48ITe1sNfK5811M4dGXvt9hxZH95fYqOqI';
    
    // 模拟游戏结束 - 黑方获胜
    const endGameResponse = await fetch('http://localhost:5000/api/stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        roomId: 'TEST456',
        winner: 'black',
        blackPlayerId: 11,
        whitePlayerId: 1 // 假设用户ID为1的另一个用户
      })
    });

    const endGameData = await endGameResponse.json();
    console.log('Game ended response:', endGameData);

    // 检查更新后的统计
    const statsResponse = await fetch('http://localhost:5000/api/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const statsData = await statsResponse.json();
    console.log('Updated stats:', JSON.stringify(statsData, null, 2));

  } catch (error) {
    console.error('Test error:', error);
  }
};

testStatsUpdate();