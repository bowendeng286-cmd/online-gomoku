-- Database migration script for ELO rating system
-- This script ensures all users have proper ELO ratings and game statistics

-- Update existing users to have proper default values if they are NULL
UPDATE users 
SET elo_rating = 1200 
WHERE elo_rating IS NULL;

UPDATE users 
SET games_played = 0 
WHERE games_played IS NULL;

UPDATE users 
SET games_won = 0 
WHERE games_won IS NULL;

UPDATE users 
SET games_lost = 0 
WHERE games_lost IS NULL;

UPDATE users 
SET games_drawn = 0 
WHERE games_drawn IS NULL;

-- Add updated_at timestamp if it doesn't exist
UPDATE users 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN elo_rating = 1200 THEN 1 END) as default_elo_users,
    COUNT(CASE WHEN games_played > 0 THEN 1 END) as active_users,
    AVG(elo_rating) as average_elo,
    MAX(elo_rating) as highest_elo,
    MIN(elo_rating) as lowest_elo
FROM users;

-- Show sample user data
SELECT id, username, elo_rating, games_played, games_won, games_lost, games_drawn 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;