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

const app = express();
const PORT = 3000;

// Serve static files (CSS, JS, images)
app.use(express.static(__dirname));
//translates data input
app.use(express.json());

// Serve the HTML file at the root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
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
  

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
