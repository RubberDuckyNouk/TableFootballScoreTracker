require('dotenv').config(); // Load env variables
const { Pool } = require('pg'); // connection pool package
const isProduction = process.env.NODE_ENV === 'production'; //only use SSL db connection in prod

    // Create a PostgreSQL connection pool --> keeps connection to db fast when in use
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false
      });

    // connection message for testing
    pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection error:', err.stack);
    } else {
        console.log('✅ Connected to DB:', res.rows[0]);
    }
    });

    // Run migrations
    const { runMigrations } = require('./migrate');
    runMigrations(pool).catch(err => {
        console.error('Failed to run migrations:', err);
        process.exit(1);
    });

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// ELO RATING SYSTEM
// =======================

/**
 * Calculate expected score for ELO rating
 * @param {number} playerRating - Player's current rating
 * @param {number} opponentRating - Opponent's current rating
 * @returns {number} Expected score (0-1)
 */
function calculateExpectedScore(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate new ELO rating after a game
 * @param {number} currentRating - Player's current rating
 * @param {number} opponentRating - Opponent's rating
 * @param {number} actualScore - 1 for win, 0 for loss
 * @param {number} gamesPlayed - Number of games player has played
 * @param {boolean} isTeamGame - Whether this is a team game (reduces K-factor)
 * @returns {number} New rating
 */
function calculateNewRating(currentRating, opponentRating, actualScore, gamesPlayed, isTeamGame = false) {
    // K-factor: higher for new players, lower for experienced players
    let K = gamesPlayed < 20 ? 40 : 20;

    // Reduce K-factor for team games (less individual impact)
    if (isTeamGame) {
        K *= 0.75;
    }

    const expectedScore = calculateExpectedScore(currentRating, opponentRating);
    const newRating = currentRating + K * (actualScore - expectedScore);

    return Math.round(newRating);
}

/**
 * Get or create a player in the database
 * @param {string} name - Player name (case-insensitive)
 * @returns {Promise<{id, name, rating, games_played}>}
 */
async function getOrCreatePlayer(name) {
    const nameLower = name.toLowerCase();

    // Try to find existing player
    const existingPlayer = await pool.query(
        'SELECT id, name, rating, games_played FROM players WHERE LOWER(name) = $1',
        [nameLower]
    );

    if (existingPlayer.rows.length > 0) {
        return existingPlayer.rows[0];
    }

    // Create new player with default rating 1200
    const newPlayer = await pool.query(
        'INSERT INTO players (name, rating, games_played) VALUES ($1, 1200, 0) RETURNING id, name, rating, games_played',
        [name]
    );

    return newPlayer.rows[0];
}

/**
 * Update player's rating and games_played count
 */
async function updatePlayerRating(playerId, newRating, gamesPlayedIncrement = 1) {
    await pool.query(
        'UPDATE players SET rating = $1, games_played = games_played + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newRating, gamesPlayedIncrement, playerId]
    );
}

// Serve static files (CSS, JS, images)
app.use(express.static(__dirname));
//translates data input
app.use(express.json());

// Serve the HTML file at the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
 
//single game data save
app.post("/saveSingle", async (req, res) => {
    const { winner, loser } = req.body;
    if (!winner || !loser) {
      return res.status(400).json({ error: "A name is required in all fields of a game" });
    }
    //get current date
    const date = new Date().toISOString();

    try {
      // Get or create both players
      const winnerPlayer = await getOrCreatePlayer(winner);
      const loserPlayer = await getOrCreatePlayer(loser);

      // Calculate new ratings
      const winnerNewRating = calculateNewRating(
        winnerPlayer.rating,
        loserPlayer.rating,
        1, // win
        winnerPlayer.games_played,
        false // not a team game
      );

      const loserNewRating = calculateNewRating(
        loserPlayer.rating,
        winnerPlayer.rating,
        0, // loss
        loserPlayer.games_played,
        false // not a team game
      );

      // Calculate rating changes
      const winnerChange = winnerNewRating - winnerPlayer.rating;
      const loserChange = loserNewRating - loserPlayer.rating;

      // Save game with rating information
      const queryText = `
        INSERT INTO single_game_results (
          date, winner, loser,
          winner_rating_before, winner_rating_after,
          loser_rating_before, loser_rating_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await pool.query(queryText, [
        date, winner, loser,
        winnerPlayer.rating, winnerNewRating,
        loserPlayer.rating, loserNewRating
      ]);

      // Update player ratings
      await updatePlayerRating(winnerPlayer.id, winnerNewRating);
      await updatePlayerRating(loserPlayer.id, loserNewRating);

      res.json({
        success: true,
        message: "Saved successfully!",
        ratings: {
          winner: {
            name: winner,
            oldRating: winnerPlayer.rating,
            newRating: winnerNewRating,
            change: winnerChange
          },
          loser: {
            name: loser,
            oldRating: loserPlayer.rating,
            newRating: loserNewRating,
            change: loserChange
          }
        }
      });
    } catch (err) {
      console.error("DB insert error:", err);
      res.status(500).json({ error: "Failed to save to database" });
    }
  });


//team game data save
app.post("/saveTeam", async (req, res) => {
    const { winnerAttack, winnerDefense, loserAttack, loserDefense } = req.body;
    if (!winnerAttack || !winnerDefense || !loserAttack || !loserDefense) {
      return res.status(400).json({ error: "a name is required in all fields of a game" });
    }
    //get current date
    const date = new Date().toISOString();

    try {
      // Get or create all players
      const winnerAttackPlayer = await getOrCreatePlayer(winnerAttack);
      const winnerDefensePlayer = await getOrCreatePlayer(winnerDefense);
      const loserAttackPlayer = await getOrCreatePlayer(loserAttack);
      const loserDefensePlayer = await getOrCreatePlayer(loserDefense);

      // Calculate average team ratings
      const winningTeamAvgRating = Math.round(
        (winnerAttackPlayer.rating + winnerDefensePlayer.rating) / 2
      );
      const losingTeamAvgRating = Math.round(
        (loserAttackPlayer.rating + loserDefensePlayer.rating) / 2
      );

      // Calculate new ratings for each player (using team average as opponent rating)
      const winnerAttackNewRating = calculateNewRating(
        winnerAttackPlayer.rating,
        losingTeamAvgRating,
        1, // win
        winnerAttackPlayer.games_played,
        true // team game
      );

      const winnerDefenseNewRating = calculateNewRating(
        winnerDefensePlayer.rating,
        losingTeamAvgRating,
        1, // win
        winnerDefensePlayer.games_played,
        true // team game
      );

      const loserAttackNewRating = calculateNewRating(
        loserAttackPlayer.rating,
        winningTeamAvgRating,
        0, // loss
        loserAttackPlayer.games_played,
        true // team game
      );

      const loserDefenseNewRating = calculateNewRating(
        loserDefensePlayer.rating,
        winningTeamAvgRating,
        0, // loss
        loserDefensePlayer.games_played,
        true // team game
      );

      // Save game with rating information
      const queryText = `
        INSERT INTO team_game_results (
          date, winner_attack, winner_defense, loser_attack, loser_defense,
          winner_attack_rating_before, winner_attack_rating_after,
          winner_defense_rating_before, winner_defense_rating_after,
          loser_attack_rating_before, loser_attack_rating_after,
          loser_defense_rating_before, loser_defense_rating_after
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `;
      await pool.query(queryText, [
        date, winnerAttack, winnerDefense, loserAttack, loserDefense,
        winnerAttackPlayer.rating, winnerAttackNewRating,
        winnerDefensePlayer.rating, winnerDefenseNewRating,
        loserAttackPlayer.rating, loserAttackNewRating,
        loserDefensePlayer.rating, loserDefenseNewRating
      ]);

      // Update all player ratings
      await updatePlayerRating(winnerAttackPlayer.id, winnerAttackNewRating);
      await updatePlayerRating(winnerDefensePlayer.id, winnerDefenseNewRating);
      await updatePlayerRating(loserAttackPlayer.id, loserAttackNewRating);
      await updatePlayerRating(loserDefensePlayer.id, loserDefenseNewRating);

      res.json({
        success: true,
        message: "Saved successfully!",
        ratings: {
          winnerAttack: {
            name: winnerAttack,
            oldRating: winnerAttackPlayer.rating,
            newRating: winnerAttackNewRating,
            change: winnerAttackNewRating - winnerAttackPlayer.rating
          },
          winnerDefense: {
            name: winnerDefense,
            oldRating: winnerDefensePlayer.rating,
            newRating: winnerDefenseNewRating,
            change: winnerDefenseNewRating - winnerDefensePlayer.rating
          },
          loserAttack: {
            name: loserAttack,
            oldRating: loserAttackPlayer.rating,
            newRating: loserAttackNewRating,
            change: loserAttackNewRating - loserAttackPlayer.rating
          },
          loserDefense: {
            name: loserDefense,
            oldRating: loserDefensePlayer.rating,
            newRating: loserDefenseNewRating,
            change: loserDefenseNewRating - loserDefensePlayer.rating
          }
        }
      });
    } catch (err) {
      console.error("DB insert error:", err);
      res.status(500).json({ error: "Failed to save to database" });
    }
  });

//get all unique player names
app.get("/players", async (req, res) => {
  try {
    // Get all players from players table with their rankings
    const playersQuery = `
      SELECT
        name,
        rating,
        RANK() OVER (ORDER BY rating DESC) as rank
      FROM players
      ORDER BY name
    `;

    const result = await pool.query(playersQuery);
    const players = result.rows;

    res.json(players);
  } catch (err) {
    console.error("DB query error:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

//get player statistics
app.get("/stats", async (req, res) => {
  try {
    // Get single game wins
    const singleWinsQuery = `
      SELECT LOWER(winner) as player_name, COUNT(*) as wins
      FROM single_game_results
      GROUP BY LOWER(winner)
    `;

    // Get single game losses
    const singleLossesQuery = `
      SELECT LOWER(loser) as player_name, COUNT(*) as losses
      FROM single_game_results
      GROUP BY LOWER(loser)
    `;

    // Get team game wins (case-insensitive, counting both attack and defense positions)
    const teamWinsQuery = `
      SELECT player_name, SUM(wins) as wins FROM (
        SELECT LOWER(winner_attack) as player_name, COUNT(*) as wins
        FROM team_game_results
        GROUP BY LOWER(winner_attack)
        UNION ALL
        SELECT LOWER(winner_defense) as player_name, COUNT(*) as wins
        FROM team_game_results
        GROUP BY LOWER(winner_defense)
      ) combined
      GROUP BY player_name
    `;

    // Get team game losses (case-insensitive, counting both attack and defense positions)
    const teamLossesQuery = `
      SELECT player_name, SUM(losses) as losses FROM (
        SELECT LOWER(loser_attack) as player_name, COUNT(*) as losses
        FROM team_game_results
        GROUP BY LOWER(loser_attack)
        UNION ALL
        SELECT LOWER(loser_defense) as player_name, COUNT(*) as losses
        FROM team_game_results
        GROUP BY LOWER(loser_defense)
      ) combined
      GROUP BY player_name
    `;

    const singleWins = await pool.query(singleWinsQuery);
    const singleLosses = await pool.query(singleLossesQuery);
    const teamWins = await pool.query(teamWinsQuery);
    const teamLosses = await pool.query(teamLossesQuery);

    // Combine results and aggregate wins/losses
    const playerStats = {};

    // Add single game wins
    singleWins.rows.forEach(row => {
      const name = row.player_name;
      if (!playerStats[name]) {
        playerStats[name] = { singleWins: 0, teamWins: 0, totalWins: 0, singleLosses: 0, teamLosses: 0, totalLosses: 0 };
      }
      playerStats[name].singleWins = parseInt(row.wins);
      playerStats[name].totalWins += parseInt(row.wins);
    });

    // Add single game losses
    singleLosses.rows.forEach(row => {
      const name = row.player_name;
      if (!playerStats[name]) {
        playerStats[name] = { singleWins: 0, teamWins: 0, totalWins: 0, singleLosses: 0, teamLosses: 0, totalLosses: 0 };
      }
      playerStats[name].singleLosses = parseInt(row.losses);
      playerStats[name].totalLosses += parseInt(row.losses);
    });

    // Add team game wins
    teamWins.rows.forEach(row => {
      const name = row.player_name;
      if (!playerStats[name]) {
        playerStats[name] = { singleWins: 0, teamWins: 0, totalWins: 0, singleLosses: 0, teamLosses: 0, totalLosses: 0 };
      }
      playerStats[name].teamWins = parseInt(row.wins);
      playerStats[name].totalWins += parseInt(row.wins);
    });

    // Add team game losses
    teamLosses.rows.forEach(row => {
      const name = row.player_name;
      if (!playerStats[name]) {
        playerStats[name] = { singleWins: 0, teamWins: 0, totalWins: 0, singleLosses: 0, teamLosses: 0, totalLosses: 0 };
      }
      playerStats[name].teamLosses = parseInt(row.losses);
      playerStats[name].totalLosses += parseInt(row.losses);
    });

    // Get ratings from players table
    const ratingsQuery = await pool.query(
      'SELECT LOWER(name) as player_name, rating, games_played FROM players'
    );

    // Add ratings to player stats
    ratingsQuery.rows.forEach(row => {
      const name = row.player_name;
      if (playerStats[name]) {
        playerStats[name].rating = row.rating;
        playerStats[name].gamesPlayed = row.games_played;
      }
    });

    // Convert to array and sort by rating (highest first)
    const statsArray = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter for display
        rating: stats.rating || 1200, // Default rating if not found
        gamesPlayed: stats.gamesPlayed || 0,
        ...stats
      }))
      .sort((a, b) => b.rating - a.rating); // Sort by rating instead of wins

    res.json(statsArray);
  } catch (err) {
    console.error("DB query error:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

// Get recent games with rating changes
app.get("/recentGames", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Get recent single games
    const singleGamesQuery = `
      SELECT
        id,
        'single' as game_type,
        date,
        winner,
        loser,
        NULL as winner_attack,
        NULL as winner_defense,
        NULL as loser_attack,
        NULL as loser_defense,
        winner_rating_before,
        winner_rating_after,
        loser_rating_before,
        loser_rating_after,
        NULL as winner_attack_rating_before,
        NULL as winner_attack_rating_after,
        NULL as winner_defense_rating_before,
        NULL as winner_defense_rating_after,
        NULL as loser_attack_rating_before,
        NULL as loser_attack_rating_after,
        NULL as loser_defense_rating_before,
        NULL as loser_defense_rating_after
      FROM single_game_results
      WHERE winner_rating_after IS NOT NULL
    `;

    // Get recent team games
    const teamGamesQuery = `
      SELECT
        id,
        'team' as game_type,
        date,
        NULL as winner,
        NULL as loser,
        winner_attack,
        winner_defense,
        loser_attack,
        loser_defense,
        NULL as winner_rating_before,
        NULL as winner_rating_after,
        NULL as loser_rating_before,
        NULL as loser_rating_after,
        winner_attack_rating_before,
        winner_attack_rating_after,
        winner_defense_rating_before,
        winner_defense_rating_after,
        loser_attack_rating_before,
        loser_attack_rating_after,
        loser_defense_rating_before,
        loser_defense_rating_after
      FROM team_game_results
      WHERE winner_attack_rating_after IS NOT NULL
    `;

    // Combine and order by date
    const combinedQuery = `
      SELECT * FROM (
        ${singleGamesQuery}
        UNION ALL
        ${teamGamesQuery}
      ) all_games
      ORDER BY date DESC
      LIMIT $1
    `;

    const result = await pool.query(combinedQuery, [limit]);

    // Format the games for display
    const games = result.rows.map(game => {
      if (game.game_type === 'single') {
        return {
          id: game.id,
          type: 'single',
          date: game.date,
          players: [
            {
              name: game.winner,
              result: 'won',
              ratingBefore: game.winner_rating_before,
              ratingAfter: game.winner_rating_after,
              change: game.winner_rating_after - game.winner_rating_before
            },
            {
              name: game.loser,
              result: 'lost',
              ratingBefore: game.loser_rating_before,
              ratingAfter: game.loser_rating_after,
              change: game.loser_rating_after - game.loser_rating_before
            }
          ]
        };
      } else {
        return {
          id: game.id,
          type: 'team',
          date: game.date,
          players: [
            {
              name: game.winner_attack,
              role: 'attack',
              result: 'won',
              ratingBefore: game.winner_attack_rating_before,
              ratingAfter: game.winner_attack_rating_after,
              change: game.winner_attack_rating_after - game.winner_attack_rating_before
            },
            {
              name: game.winner_defense,
              role: 'defense',
              result: 'won',
              ratingBefore: game.winner_defense_rating_before,
              ratingAfter: game.winner_defense_rating_after,
              change: game.winner_defense_rating_after - game.winner_defense_rating_before
            },
            {
              name: game.loser_attack,
              role: 'attack',
              result: 'lost',
              ratingBefore: game.loser_attack_rating_before,
              ratingAfter: game.loser_attack_rating_after,
              change: game.loser_attack_rating_after - game.loser_attack_rating_before
            },
            {
              name: game.loser_defense,
              role: 'defense',
              result: 'lost',
              ratingBefore: game.loser_defense_rating_before,
              ratingAfter: game.loser_defense_rating_after,
              change: game.loser_defense_rating_after - game.loser_defense_rating_before
            }
          ]
        };
      }
    });

    res.json(games);
  } catch (err) {
    console.error("DB query error:", err);
    res.status(500).json({ error: "Failed to fetch recent games" });
  }
});

// Delete a game and revert rating changes
app.delete("/deleteGame/:type/:id", async (req, res) => {
  const { type, id } = req.params;

  try {
    const tableName = type === 'single' ? 'single_game_results' : 'team_game_results';

    // Get the game data before deleting
    const result = await pool.query(
      `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Game not found" });
    }

    const game = result.rows[0];

    // Revert rating changes for all players involved
    if (type === 'single') {
      // Revert winner's rating
      if (game.winner_rating_before !== null && game.winner_rating_after !== null) {
        const ratingChange = game.winner_rating_after - game.winner_rating_before;
        await pool.query(
          `UPDATE players
           SET rating = rating - $1,
               games_played = GREATEST(games_played - 1, 0),
               updated_at = CURRENT_TIMESTAMP
           WHERE LOWER(name) = LOWER($2)`,
          [ratingChange, game.winner]
        );
      }

      // Revert loser's rating
      if (game.loser_rating_before !== null && game.loser_rating_after !== null) {
        const ratingChange = game.loser_rating_after - game.loser_rating_before;
        await pool.query(
          `UPDATE players
           SET rating = rating - $1,
               games_played = GREATEST(games_played - 1, 0),
               updated_at = CURRENT_TIMESTAMP
           WHERE LOWER(name) = LOWER($2)`,
          [ratingChange, game.loser]
        );
      }
    } else {
      // Team game - revert all 4 players
      const players = [
        { name: game.winner_attack, before: game.winner_attack_rating_before, after: game.winner_attack_rating_after },
        { name: game.winner_defense, before: game.winner_defense_rating_before, after: game.winner_defense_rating_after },
        { name: game.loser_attack, before: game.loser_attack_rating_before, after: game.loser_attack_rating_after },
        { name: game.loser_defense, before: game.loser_defense_rating_before, after: game.loser_defense_rating_after }
      ];

      for (const player of players) {
        if (player.before !== null && player.after !== null) {
          const ratingChange = player.after - player.before;
          await pool.query(
            `UPDATE players
             SET rating = rating - $1,
                 games_played = GREATEST(games_played - 1, 0),
                 updated_at = CURRENT_TIMESTAMP
             WHERE LOWER(name) = LOWER($2)`,
            [ratingChange, player.name]
          );
        }
      }
    }

    res.json({ message: "Game deleted and ratings reverted successfully", game });
  } catch (err) {
    console.error("Error deleting game:", err);
    res.status(500).json({ error: "Failed to delete game" });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Hot reload is active - nodemon watching for changes`);
});
