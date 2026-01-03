-- 创建测试用户（可选）
-- 用户名: testuser
-- 密码: test123
-- 注意：密码哈希值是通过 bcrypt 生成的，不可逆

INSERT INTO users (username, password_hash, user_type, elo_rating, games_played, games_won, games_lost, games_drawn)
VALUES (
  'testuser',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5UG1zW6z5P.5W',
  'regular',
  1200,
  0,
  0,
  0,
  0
)
ON CONFLICT (username) DO NOTHING;

-- 验证测试用户
SELECT id, username, user_type, elo_rating FROM users WHERE username = 'testuser';
