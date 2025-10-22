-- Create players table to track ratings
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    rating INTEGER NOT NULL DEFAULT 1200,
    games_played INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on name for faster lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_players_name_lower ON players (LOWER(name));

-- Add rating_change columns to existing game tables to track history
ALTER TABLE single_game_results
ADD COLUMN IF NOT EXISTS winner_rating_before INTEGER,
ADD COLUMN IF NOT EXISTS winner_rating_after INTEGER,
ADD COLUMN IF NOT EXISTS loser_rating_before INTEGER,
ADD COLUMN IF NOT EXISTS loser_rating_after INTEGER;

ALTER TABLE team_game_results
ADD COLUMN IF NOT EXISTS winner_attack_rating_before INTEGER,
ADD COLUMN IF NOT EXISTS winner_attack_rating_after INTEGER,
ADD COLUMN IF NOT EXISTS winner_defense_rating_before INTEGER,
ADD COLUMN IF NOT EXISTS winner_defense_rating_after INTEGER,
ADD COLUMN IF NOT EXISTS loser_attack_rating_before INTEGER,
ADD COLUMN IF NOT EXISTS loser_attack_rating_after INTEGER,
ADD COLUMN IF NOT EXISTS loser_defense_rating_before INTEGER,
ADD COLUMN IF NOT EXISTS loser_defense_rating_after INTEGER;
