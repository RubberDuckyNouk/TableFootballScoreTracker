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

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;

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
    //save to db
    try {
      const queryText = `
        INSERT INTO single_game_results (date, winner, loser)
        VALUES ($1, $2, $3)
      `;
      await pool.query(queryText, [date, winner, loser]);
      res.json({ success: true, message: "Saved successfully!" });
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
    //save to db
    try {
      const queryText = `
        INSERT INTO team_game_results 
          (date, winner_attack, winner_defense, loser_attack, loser_defense)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(queryText, [date, winnerAttack, winnerDefense, loserAttack, loserDefense]);
      res.json({ success: true, message: "Saved successfully!" });
    } catch (err) {
      console.error("DB insert error:", err);
      res.status(500).json({ error: "Failed to save to database" });
    }
  });

//get all unique player names
app.get("/players", async (req, res) => {
  try {
    // Get all unique player names from both single and team games (case-insensitive)
    const playersQuery = `
      SELECT DISTINCT name FROM (
        SELECT LOWER(winner) as name FROM single_game_results
        UNION
        SELECT LOWER(loser) as name FROM single_game_results
        UNION
        SELECT LOWER(winner_attack) as name FROM team_game_results
        UNION
        SELECT LOWER(winner_defense) as name FROM team_game_results
        UNION
        SELECT LOWER(loser_attack) as name FROM team_game_results
        UNION
        SELECT LOWER(loser_defense) as name FROM team_game_results
      ) all_players
      ORDER BY name
    `;

    const result = await pool.query(playersQuery);
    // Capitalize first letter for display
    const players = result.rows.map(row =>
      row.name.charAt(0).toUpperCase() + row.name.slice(1)
    );

    res.json(players);
  } catch (err) {
    console.error("DB query error:", err);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

//get player statistics
app.get("/stats", async (req, res) => {
  try {
    // Get single game wins (case-insensitive)
    const singleWinsQuery = `
      SELECT LOWER(winner) as player_name, COUNT(*) as wins
      FROM single_game_results
      GROUP BY LOWER(winner)
    `;

    // Get single game losses (case-insensitive)
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

    // Convert to array and sort by total wins
    const statsArray = Object.entries(playerStats)
      .map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter for display
        ...stats
      }))
      .sort((a, b) => b.totalWins - a.totalWins);

    res.json(statsArray);
  } catch (err) {
    console.error("DB query error:", err);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Hot reload is active - nodemon watching for changes`);
});
