# Ticket 07: Backend - Scope all endpoints by office_id

## Summary
Update all existing API endpoints to filter by `office_id`, so each office only sees its own players, games, and stats.

## Prerequisites
- Ticket 03 (office_id columns exist)
- Ticket 04 (existing data migrated to default office)

## Steps

### 1. Update `getOrCreatePlayer()` in `index.js`

The function needs to accept and use an `officeId` parameter:

```js
async function getOrCreatePlayer(name, officeId) {
    const nameLower = name.toLowerCase();

    const existingPlayer = await pool.query(
        'SELECT id, name, rating, games_played FROM players WHERE LOWER(name) = $1 AND office_id = $2',
        [nameLower, officeId]
    );

    if (existingPlayer.rows.length > 0) {
        return existingPlayer.rows[0];
    }

    const newPlayer = await pool.query(
        'INSERT INTO players (name, rating, games_played, office_id) VALUES ($1, 1200, 0, $2) RETURNING id, name, rating, games_played',
        [name, officeId]
    );

    return newPlayer.rows[0];
}
```

### 2. Update `POST /saveSingle`

Extract `officeId` from the request body and pass it through:

```js
app.post("/saveSingle", async (req, res) => {
    const { winner, loser, officeId } = req.body;
    if (!winner || !loser || !officeId) {
      return res.status(400).json({ error: "Winner, loser, and officeId are required" });
    }
    // ... rest stays the same, but pass officeId to getOrCreatePlayer:
    const winnerPlayer = await getOrCreatePlayer(winner, officeId);
    const loserPlayer = await getOrCreatePlayer(loser, officeId);

    // ... and add office_id to the INSERT:
    const queryText = `
        INSERT INTO single_game_results (
          date, winner, loser,
          winner_rating_before, winner_rating_after,
          loser_rating_before, loser_rating_after,
          office_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await pool.query(queryText, [
        date, winner, loser,
        winnerPlayer.rating, winnerNewRating,
        loserPlayer.rating, loserNewRating,
        officeId
    ]);
    // ... rest stays the same
});
```

### 3. Update `POST /saveTeam`

Same pattern -- extract `officeId` from `req.body`, pass to `getOrCreatePlayer()`, include in the INSERT.

### 4. Update `GET /players`

Accept `officeId` as a query parameter and filter:

```js
app.get("/players", async (req, res) => {
  const officeId = req.query.officeId;
  if (!officeId) {
    return res.status(400).json({ error: "officeId is required" });
  }

  try {
    const playersQuery = `
      SELECT name, rating, last_played_at
      FROM players
      WHERE office_id = $1
      ORDER BY name
    `;
    const result = await pool.query(playersQuery, [officeId]);
    // ... rest stays the same
  }
});
```

### 5. Update `GET /stats`

Add `WHERE office_id = $1` to all stat queries (singleWinsQuery, singleLossesQuery, teamWinsQuery, teamLossesQuery, and ratingsQuery). Accept `officeId` as a query parameter.

### 6. Update `GET /recentGames`

Add `AND office_id = $1` to both the singleGamesQuery and teamGamesQuery WHERE clauses. Accept `officeId` as a query parameter.

### 7. Update `DELETE /deleteGame/:type/:id`

Add an `officeId` check to make sure users can only delete games from their own office:

```js
app.delete("/deleteGame/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  const officeId = req.query.officeId;

  // ... existing logic, but add to the DELETE query:
  const result = await pool.query(
    `DELETE FROM ${tableName} WHERE id = $1 AND office_id = $2 RETURNING *`,
    [id, officeId]
  );
  // ... rest stays the same
});
```

### 8. Verify
- Test each endpoint with an `officeId` parameter
- Confirm that creating a player in Office 1 doesn't show up in Office 2's player list
- Confirm that game saves include the correct `office_id` in the database

## Notes
- This is the biggest ticket -- take it endpoint by endpoint
- The `officeId` is passed as a simple parameter (not via auth tokens), which is fine for this app's security model
- All the query changes follow the same pattern: add `AND office_id = $X` to WHERE clauses
