import { getDb, getClient } from "./db";
import { initializeDatabase } from "./migrate";

/**
 * 测试数据库连接
 */
export async function testConnection() {
  try {
    console.log("Testing database connection...");
    
    const client = await getClient();
    
    try {
      const result = await client.query("SELECT NOW() as current_time, version() as version");
      console.log("✅ Database connection successful!");
      console.log("   Current time:", result.rows[0].current_time);
      console.log("   PostgreSQL version:", result.rows[0].version.split(' ')[0]);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

/**
 * 完整的数据库初始化和测试
 */
export async function initializeAndTestDatabase() {
  console.log("🚀 Starting database initialization and testing...");
  
  // 1. 测试连接
  const connectionOk = await testConnection();
  if (!connectionOk) {
    throw new Error("Database connection failed");
  }
  
  // 2. 初始化表结构
  await initializeDatabase();
  
  // 3. 测试基本操作
  await testBasicOperations();
  
  console.log("✅ Database initialization and testing completed successfully!");
}

/**
 * 测试基本的数据库操作
 */
async function testBasicOperations() {
  console.log("Testing basic database operations...");
  
  const db = await getDb();
  
  try {
    // 测试查询用户表
    const users = await db.select({ count: require("drizzle-orm").sql`COUNT(*)::int` })
      .from(require("./shared/schema").users);
    
    console.log(`   Users table exists, current count: ${users[0].count}`);
    
    // 测试查询会话表
    const sessions = await db.select({ count: require("drizzle-orm").sql`COUNT(*)::int` })
      .from(require("./shared/schema").userSessions);
    
    console.log(`   User sessions table exists, current count: ${sessions[0].count}`);
    
    console.log("   ✅ All database operations working correctly");
  } catch (error) {
    console.error("   ❌ Basic operations test failed:", error);
    throw error;
  }
}

// 如果直接运行此文件
if (require.main === module) {
  initializeAndTestDatabase()
    .then(() => {
      console.log("Database setup completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Database setup failed:", error);
      process.exit(1);
    });
}