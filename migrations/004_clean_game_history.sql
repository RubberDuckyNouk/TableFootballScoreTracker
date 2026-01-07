-- Clean game history but keep players
-- This will delete all game records and reset player statistics

-- Delete all single game results
DELETE FROM single_game_results;

-- Delete all team game results
DELETE FROM team_game_results;

-- Reset player statistics to defaults
UPDATE players
SET
    rating = 1200,
    games_played = 0,
    last_played_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;
