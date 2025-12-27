#!/usr/bin/env node

const http = require('http');

// 配置
const BASE_URL = `http://localhost:${process.env.DEPLOY_RUN_PORT || 3000}`;

// 测试用户凭据
const testUsers = [
  { username: 'testuser01', email: 'test01@example.com', password: 'testpass123' },
  { username: 'testuser02', email: 'test02@example.com', password: 'testpass123' }
];

// HTTP请求辅助函数
function makeRequest(path, method, data, token) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: process.env.DEPLOY_RUN_PORT || 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// 注册用户
async function registerUser(user) {
  try {
    const response = await makeRequest('/api/auth', 'POST', {
      action: 'register',
      username: user.username,
      email: user.email,
      password: user.password
    });
    
    if (response.status === 200 && response.data.success) {
      console.log(`✓ 用户 ${user.email} 注册成功`);
      return response.data.token;
    } else if (response.status === 409) {
      console.log(`ℹ️  用户 ${user.email} 已存在，尝试登录`);
      return await loginUser(user);
    } else {
      console.error(`✗ 用户 ${user.email} 注册失败:`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`✗ 用户 ${user.email} 注册请求失败:`, error.message);
    return null;
  }
}

// 登录用户
async function loginUser(user) {
  try {
    const response = await makeRequest('/api/auth', 'POST', {
      action: 'login',
      email: user.email,
      password: user.password
    });
    
    if (response.status === 200 && response.data.success) {
      console.log(`✓ 用户 ${user.email} 登录成功`);
      return response.data.token;
    } else {
      console.error(`✗ 用户 ${user.email} 登录失败:`, response.data);
      return null;
    }
  } catch (error) {
    console.error(`✗ 用户 ${user.email} 登录请求失败:`, error.message);
    return null;
  }
}

// 创建测试用户
async function createTestUsers() {
  console.log('🚀 开始创建测试用户\n');

  const tokens = [];
  
  for (const user of testUsers) {
    const token = await registerUser(user);
    if (token) {
      tokens.push(token);
    }
  }

  if (tokens.length === testUsers.length) {
    console.log('\n✅ 所有测试用户创建成功！');
    console.log('📋 用户列表:');
    testUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.username} (${user.email})`);
    });
  } else {
    console.log('\n❌ 部分用户创建失败');
  }
}

// 运行创建
createTestUsers().catch(console.error);