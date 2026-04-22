# Ticket 04: Migrate existing data to a default office (Migration 007)

## Summary
Create a default office for existing data and assign all current players and game records to it.

## Prerequisites
- Ticket 01 (offices table)
- Ticket 03 (office_id columns)

## Steps

### 1. Create migration file `migrations/007_migrate_existing_data.sql`

```sql
-- Insert a default office for existing data
-- Use a known hash for a temporary password (change this after migration!)
-- This hash is for the password 'changeme' with 10 salt rounds
INSERT INTO offices (name, password_hash)
VALUES ('Default Office', '$2b$10$placeholder_replace_with_real_hash')
ON CONFLICT (name) DO NOTHING;

-- Assign all existing players to the default office
UPDATE players
SET office_id = (SELECT id FROM offices WHERE name = 'Default Office')
WHERE office_id IS NULL;

-- Assign all existing single game results to the default office
UPDATE single_game_results
SET office_id = (SELECT id FROM offices WHERE name = 'Default Office')
WHERE office_id IS NULL;

-- Assign all existing team game results to the default office
UPDATE team_game_results
SET office_id = (SELECT id FROM offices WHERE name = 'Default Office')
WHERE office_id IS NULL;
```

### 2. Generate the real bcrypt hash
Before running the migration, generate a real hash to replace the placeholder:
```js
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('changeme', 10);
console.log(hash); // paste this into the SQL above
```

### 3. Verify
- Run `npm run dev` and confirm migration applies
- Check that all rows have been assigned:
  ```sql
  SELECT COUNT(*) FROM players WHERE office_id IS NULL;          -- should be 0
  SELECT COUNT(*) FROM single_game_results WHERE office_id IS NULL; -- should be 0
  SELECT COUNT(*) FROM team_game_results WHERE office_id IS NULL;   -- should be 0
  ```

## Notes
- After this migration, consider making `office_id` NOT NULL in a future migration once you're confident all data is assigned
- Remember to change the default office password after deploying!
