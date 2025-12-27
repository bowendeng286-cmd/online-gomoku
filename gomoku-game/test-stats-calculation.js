// Test script for stats calculation accuracy
const testStatsCalculation = () => {
  console.log('=== 测试统计数据计算 ===\n');
  
  // 测试用例
  const testCases = [
    { gamesPlayed: 10, gamesWon: 7, gamesLost: 2, gamesDrawn: 1, expectedWinRate: 70.0 },
    { gamesPlayed: 5, gamesWon: 3, gamesLost: 1, gamesDrawn: 1, expectedWinRate: 60.0 },
    { gamesPlayed: 0, gamesWon: 0, gamesLost: 0, gamesDrawn: 0, expectedWinRate: 0 },
    { gamesPlayed: 100, gamesWon: 55, gamesLost: 30, gamesDrawn: 15, expectedWinRate: 55.0 },
    { gamesPlayed: 3, gamesWon: 1, gamesLost: 2, gamesDrawn: 0, expectedWinRate: 33.33 },
  ];
  
  testCases.forEach((testCase, index) => {
    const { gamesPlayed, gamesWon, expectedWinRate } = testCase;
    
    // 修复前的计算方式（可能导致精度问题）
    const oldCalculation = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
    
    // 修复后的计算方式
    const newCalculation = gamesPlayed > 0 ? Number(((gamesWon / gamesPlayed) * 100).toFixed(2)) : 0;
    
    console.log(`测试用例 ${index + 1}:`);
    console.log(`  总局数: ${gamesPlayed}, 胜利: ${gamesWon}`);
    console.log(`  期望胜率: ${expectedWinRate}%`);
    console.log(`  修复前计算: ${oldCalculation}%`);
    console.log(`  修复后计算: ${newCalculation}%`);
    console.log(`  精度提升: ${Math.abs(newCalculation - expectedWinRate) < Math.abs(oldCalculation - expectedWinRate) ? '✅' : '❌'}`);
    console.log('');
  });
  
  // 测试ELO计算
  console.log('=== 测试ELO计算 ===\n');
  
  const calculateEloChange = (winnerRating, loserRating) => {
    const K = 32;
    const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedScoreLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
    
    const winnerChange = Math.round(K * (1 - expectedScoreWinner));
    const loserChange = Math.round(K * (0 - expectedScoreLoser));
    
    return { winnerChange, loserChange };
  };
  
  const eloTestCases = [
    { winner: 1500, loser: 1500, expectedWinnerChange: 16, expectedLoserChange: -16 },
    { winner: 1600, loser: 1400, expectedWinnerChange: 10, expectedLoserChange: -10 },
    { winner: 1400, loser: 1600, expectedWinnerChange: 22, expectedLoserChange: -22 },
  ];
  
  eloTestCases.forEach((testCase, index) => {
    const { winner, loser, expectedWinnerChange, expectedLoserChange } = testCase;
    const { winnerChange, loserChange } = calculateEloChange(winner, loser);
    
    console.log(`ELO测试用例 ${index + 1}:`);
    console.log(`  胜者ELO: ${winner}, 败者ELO: ${loser}`);
    console.log(`  期望胜者变化: ${expectedWinnerChange}, 实际: ${winnerChange} ${winnerChange === expectedWinnerChange ? '✅' : '❌'}`);
    console.log(`  期望败者变化: ${expectedLoserChange}, 实际: ${loserChange} ${loserChange === expectedLoserChange ? '✅' : '❌'}`);
    console.log('');
  });
  
  console.log('=== 测试完成 ===');
};

// 运行测试
testStatsCalculation();