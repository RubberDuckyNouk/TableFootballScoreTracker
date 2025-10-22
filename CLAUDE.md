# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a table football (foosball) score tracking web application that records single-player and team game results to a PostgreSQL database. The application is deployed on Render and supports both local development and production environments.

## Development Commands

**Start the server:**
```bash
npm start          # Production mode (uses index.js)
npm run dev        # Development mode with auto-reload (uses nodemon)
```

**Install dependencies:**
```bash
npm install
```

**Note:** There are no test scripts configured in this project currently.

## Architecture

### Backend (index.js)
- **Framework:** Express.js server serving both API and static files
- **Database:** PostgreSQL with connection pooling via `pg` package
- **Environment-based configuration:**
  - Uses SSL for database connections in production (`NODE_ENV=production`)
  - Disables SSL for local development
- **API Endpoints:**
  - `POST /saveSingle` - Save single player game (winner, loser)
  - `POST /saveTeam` - Save team game (winner_attack, winner_defense, loser_attack, loser_defense)
- **Static file serving:** Serves the `public/` directory containing the frontend

### Database Schema
The application uses two PostgreSQL tables:

**single_game_results:**
- `date` (timestamp)
- `winner` (text)
- `loser` (text)

**team_game_results:**
- `date` (timestamp)
- `winner_attack` (text)
- `winner_defense` (text)
- `loser_attack` (text)
- `loser_defense` (text)

### Frontend (public/index.html)
- **Framework:** Vanilla JavaScript with Bootstrap 5 for styling
- **Environment detection:** Automatically switches API endpoints based on hostname:
  - `localhost` → `http://localhost:3000`
  - Production → `https://tablefootballscoretracker.onrender.com`
- **Two game modes:**
  1. Single game: Two input fields (winner vs loser)
  2. Team game: Four input fields (winning attacker/defender vs losing attacker/defender)
- **Inline JavaScript:** All client logic is embedded in the HTML file

### Styling (public/style.css)
- Flexbox-based centered layout
- Responsive design with mobile breakpoint at 768px
- Color-coded input borders (green for winners, red for losers)
- Relative units (em/rem) for scalability

## Environment Configuration

The `.env` file (gitignored) must contain:
```
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development|production
```

## Deployment Notes

- **Production URL:** https://tablefootballscoretracker.onrender.com
- **Port:** Uses `process.env.PORT` in production, defaults to 3000 locally
- **Static assets:** The Express server is configured to serve static files from the root directory (`__dirname`), but the HTML references them via the `public/` path
- **CORS:** Not explicitly configured, but may be needed if frontend and backend are separated in the future

## Known Issues

- The package.json `start` script references `dataSave.js` but the actual entry point is `index.js` (this appears to be outdated)
- The CSS file is linked as `public/style.css` in the HTML, which works because Express serves static files from the root directory
