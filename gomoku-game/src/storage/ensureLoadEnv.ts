import { execSync } from "child_process";

let envLoaded = false;

/**
 * 确保环境变量已加载
 * 调用 /source/storage_skill/drizzle/load_env.py 加载环境变量
 */
export function ensureLoadEnv(): void {
  // 如果已加载过或者环境变量中已有 PGDATABASE_URL，则直接返回
  if (envLoaded || process.env.PGDATABASE_URL) {
    return;
  }

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
    console.log("Environment variables loaded successfully");
  } catch (e) {
    console.error(`Failed to load environment variables from ${loadEnvScript}:`, e);
    throw e;
  }
}
