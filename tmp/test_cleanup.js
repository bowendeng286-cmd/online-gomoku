const { UserManager } = require('./gomoku-game/src/storage/database/userManager.ts');

async function test() {
  const userManager = new UserManager();
  try {
    console.log('Testing cleanExpiredGuestUsers...');
    const deletedCount = await userManager.cleanExpiredGuestUsers(3);
    console.log(`Deleted ${deletedCount} expired guest users`);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
