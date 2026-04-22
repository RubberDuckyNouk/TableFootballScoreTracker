# Ticket 10: Inactivity cleanup - warn and delete inactive profiles

## Summary
Implement logic to identify players who haven't played in over 2 months and display a warning. Optionally add a cleanup mechanism to remove their data.

## Prerequisites
- Ticket 03 (office_id columns, for proper scoping)
- Migration 003 already added `last_played_at` to the players table

## Steps

### 1. Add a backend endpoint to check inactive players

Add to `index.js`:

```js
// Get players who haven't played in over 2 months
app.get("/inactive-players", async (req, res) => {
    const officeId = req.query.officeId;
    if (!officeId) {
        return res.status(400).json({ error: "officeId is required" });
    }

    try {
        const result = await pool.query(`
            SELECT id, name, last_played_at
            FROM players
            WHERE office_id = $1
              AND last_played_at < NOW() - INTERVAL '2 months'
            ORDER BY last_played_at ASC
        `, [officeId]);

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching inactive players:", err);
        res.status(500).json({ error: "Failed to fetch inactive players" });
    }
});
```

### 2. Add a backend endpoint to delete an inactive player

```js
// Delete an inactive player and their game history
app.delete("/player/:id", async (req, res) => {
    const { id } = req.params;
    const officeId = req.query.officeId;

    if (!officeId) {
        return res.status(400).json({ error: "officeId is required" });
    }

    try {
        // Verify player belongs to this office and is actually inactive
        const player = await pool.query(
            `SELECT id, name, last_played_at FROM players
             WHERE id = $1 AND office_id = $2`,
            [id, officeId]
        );

        if (player.rows.length === 0) {
            return res.status(404).json({ error: "Player not found" });
        }

        const playerName = player.rows[0].name;

        // Delete player (game records will retain the player name as text)
        await pool.query('DELETE FROM players WHERE id = $1', [id]);

        res.json({
            success: true,
            message: `Player "${playerName}" has been removed`
        });
    } catch (err) {
        console.error("Error deleting player:", err);
        res.status(500).json({ error: "Failed to delete player" });
    }
});
```

### 3. Frontend - Show inactive player warnings

In `index.html`, add a function to check and display warnings. Call it when the app loads:

```js
async function checkInactivePlayers() {
    try {
        const response = await fetch(`${API_BASE}/inactive-players?officeId=${officeId}`);
        if (!response.ok) return;

        const inactivePlayers = await response.json();
        if (inactivePlayers.length === 0) return;

        // Show a warning banner
        const banner = document.createElement('div');
        banner.className = 'inactive-warning';
        banner.style.cssText = 'background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 1rem; margin: 1rem 0; max-width: 600px;';

        const names = inactivePlayers.map(p => p.name).join(', ');
        banner.innerHTML = `
            <strong>Inactive players:</strong> ${names}
            <p style="margin: 0.5rem 0 0; font-size: 0.85rem;">
                These players haven't played in over 2 months. Their profiles may be removed soon.
            </p>
        `;

        const appContainer = document.getElementById('appContainer');
        appContainer.insertBefore(banner, appContainer.firstChild);
    } catch (err) {
        console.error('Error checking inactive players:', err);
    }
}
```

Call `checkInactivePlayers()` in the `DOMContentLoaded` handler, after `loadPlayers()`.

### 4. Verify
- Manually set a player's `last_played_at` to 3 months ago in the DB for testing:
  ```sql
  UPDATE players SET last_played_at = NOW() - INTERVAL '3 months' WHERE name = 'TestPlayer';
  ```
- Load the app and confirm the warning banner appears
- Test the delete endpoint via curl

## Notes
- This ticket only implements the **warning and manual delete**. Automatic cleanup (cron job) can be added later if needed.
- Game records are NOT deleted when a player is removed -- they still show the player's name as text. Only the player profile (and their rating) is removed.
- The `last_played_at` column was already added in migration 003.
