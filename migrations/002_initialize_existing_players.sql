-- Initialize all existing players from game history with 1200 rating
-- This ensures everyone starts at the same baseline

INSERT INTO players (name, rating, games_played)
SELECT DISTINCT
    -- Capitalize first letter, keep rest as-is
    UPPER(SUBSTRING(name, 1, 1)) || LOWER(SUBSTRING(name, 2)) as name,
    1200 as rating,
    0 as games_played
FROM (
    -- Get all players from single games
    SELECT LOWER(winner) as name FROM single_game_results
    UNION
    SELECT LOWER(loser) as name FROM single_game_results
    UNION
    -- Get all players from team games
    SELECT LOWER(winner_attack) as name FROM team_game_results
    UNION
    SELECT LOWER(winner_defense) as name FROM team_game_results
    UNION
    SELECT LOWER(loser_attack) as name FROM team_game_results
    UNION
    SELECT LOWER(loser_defense) as name FROM team_game_results
) all_players
WHERE name IS NOT NULL AND TRIM(name) != ''
ON CONFLICT (name) DO NOTHING;  -- Skip if player already exists
