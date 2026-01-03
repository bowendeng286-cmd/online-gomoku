import { execSync } from "child_process";

let envLoaded = false;

/**
 * 确保环境变量已加载
 * 
 * 在不同环境中的行为：
 * - Vercel 环境：直接使用 process.env 中的环境变量
 * - 沙箱环境：调用 /source/storage_skill/drizzle/load_env.py 加载环境变量
 */
export function ensureLoadEnv(): void {
  // 如果环境变量已加载，直接返回
  if (envLoaded) {
    return;
  }

  // 检测是否在 Vercel 环境中
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined;
  
  // 如果在 Vercel 环境中，或者环境变量已存在，则直接返回
  if (isVercel || process.env.PGDATABASE_URL || process.env.DATABASE_URL) {
    envLoaded = true;
    console.log("Using environment variables from process.env");
    return;
  }

  // 沙箱环境：从 Python 脚本加载环境变量
  const loadEnvScript = "/source/storage_skill/drizzle/load_env.py";

  try {
    // 执行 load_env.py 并获取环境变量
    const output = execSync(`python3 ${loadEnvScript}`, {
      encoding: "utf-8",
      timeout: 10000,
    });

    // 解析输出的环境变量（格式: KEY=VALUE 或 export KEY=VALUE）
    const lines = output.trim().split("\n");
    for (const line of lines) {
      // 去掉可能的 "export " 前缀
      const cleanLine = line.startsWith("export ") ? line.substring(7) : line;
      const eqIndex = cleanLine.indexOf("=");
      if (eqIndex > 0) {
        const key = cleanLine.substring(0, eqIndex);
        // 去掉值两边可能的引号
        let value = cleanLine.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }

    envLoaded = true;
    console.log("Environment variables loaded successfully from Python script");
  } catch (e) {
    console.error(`Failed to load environment variables from ${loadEnvScript}:`, e);
    // 不抛出错误，因为可能在 Vercel 环境中
    envLoaded = true;
  }
}
