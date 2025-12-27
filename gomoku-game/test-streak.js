const testStreakCalculation = async () => {
  try {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjExLCJpYXQiOjE3NjY4MjMyMDksImV4cCI6MTc2NzQyODAwOX0.-ooDnQF4j48ITe1sNfK5811M4dGXvt9hxZH95fYqOqI';
    
    // 添加多场胜利来测试连胜
    for (let i = 0; i < 3; i++) {
      const response = await fetch('http://localhost:5000/api/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomId: `TEST${Date.now()}_${i}`,
          winner: 'black',
          blackPlayerId: 11,
          whitePlayerId: 1
        })
      });
      
      const result = await response.json();
      console.log(`Game ${i + 1} result:`, result);
    }

    // 检查更新后的统计
    const statsResponse = await fetch('http://localhost:5000/api/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const statsData = await statsResponse.json();
    console.log('Final stats:', JSON.stringify(statsData, null, 2));

  } catch (error) {
    console.error('Test error:', error);
  }
};

testStreakCalculation();