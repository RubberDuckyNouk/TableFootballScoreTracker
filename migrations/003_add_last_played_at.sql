-- Add last_played_at column to track when players last played a game
ALTER TABLE players
ADD COLUMN last_played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Initialize last_played_at for existing players
-- Set it to their updated_at if they have one, otherwise current timestamp
UPDATE players
SET last_played_at = COALESCE(updated_at, CURRENT_TIMESTAMP);

-- Create an index for efficient queries on last_played_at
CREATE INDEX idx_players_last_played_at ON players(last_played_at);
