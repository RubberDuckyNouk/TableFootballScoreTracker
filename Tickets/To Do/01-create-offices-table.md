# Ticket 01: Create offices table (Migration 005)

## Summary
Create a new `offices` table to store office profiles. Each office has a name and password, allowing separate groups of players to track their own games.

## Why
Multi-office support requires a central table to store office identities. All players and games will eventually be scoped to an office.

## Steps

### 1. Create migration file `migrations/005_add_offices.sql`

```sql
-- Create offices table
CREATE TABLE IF NOT EXISTS offices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Verify
- Run `npm run dev` and check the console for `Migration applied: 005_add_offices.sql`
- Confirm the table exists by connecting to your local DB:
  ```sql
  SELECT * FROM offices;
  ```

## Notes
- Password will be stored as a bcrypt hash (see Ticket 02 for the hashing dependency)
- `name` is unique so no two offices can share the same name
- The migration runner in `migrate.js` will pick this up automatically since it reads all `.sql` files from `migrations/` in sorted order
