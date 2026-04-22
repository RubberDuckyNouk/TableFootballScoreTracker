# Ticket 03: Add office_id to existing tables (Migration 006)

## Summary
Add an `office_id` foreign key to `players`, `single_game_results`, and `team_game_results` so all data is scoped to an office.

## Prerequisites
- Ticket 01 (offices table must exist first)

## Steps

### 1. Create migration file `migrations/006_add_office_id_to_tables.sql`

```sql
-- Add office_id to players table
ALTER TABLE players
ADD COLUMN IF NOT EXISTS office_id INTEGER REFERENCES offices(id);

-- Add office_id to single_game_results table
ALTER TABLE single_game_results
ADD COLUMN IF NOT EXISTS office_id INTEGER REFERENCES offices(id);

-- Add office_id to team_game_results table
ALTER TABLE team_game_results
ADD COLUMN IF NOT EXISTS office_id INTEGER REFERENCES offices(id);

-- Create indexes for faster lookups by office
CREATE INDEX IF NOT EXISTS idx_players_office_id ON players(office_id);
CREATE INDEX IF NOT EXISTS idx_single_game_results_office_id ON single_game_results(office_id);
CREATE INDEX IF NOT EXISTS idx_team_game_results_office_id ON team_game_results(office_id);
```

### 2. Verify
- Run `npm run dev` and confirm migration applies
- Check the columns exist:
  ```sql
  \d players
  \d single_game_results
  \d team_game_results
  ```

## Notes
- `office_id` is **nullable** for now -- existing data will have `NULL` as its office. This will be handled in Ticket 04 (migrate existing data to a default office).
- Foreign key constraint ensures data integrity -- you can't assign a player to a non-existent office.
- Indexes are added to speed up queries that filter by office.
