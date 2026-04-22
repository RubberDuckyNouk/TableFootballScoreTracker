# Ticket 05: Backend - Office registration endpoint

## Summary
Add a `POST /office/register` endpoint that creates a new office with a hashed password.

## Prerequisites
- Ticket 01 (offices table)
- Ticket 02 (bcrypt installed)

## Steps

### 1. Add bcrypt require at the top of `index.js`

```js
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;
```

### 2. Add the registration endpoint in `index.js`

Add this after the existing route definitions (around line 177, after the `/landing-message` endpoint):

```js
// Register a new office
app.post("/office/register", async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Office name and password are required" });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: "Password must be at least 4 characters" });
    }

    try {
        // Check if office name already exists
        const existing = await pool.query(
            'SELECT id FROM offices WHERE LOWER(name) = LOWER($1)',
            [name]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "An office with that name already exists" });
        }

        // Hash password and create office
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const result = await pool.query(
            'INSERT INTO offices (name, password_hash) VALUES ($1, $2) RETURNING id, name',
            [name, passwordHash]
        );

        const office = result.rows[0];
        res.status(201).json({
            success: true,
            message: "Office registered successfully",
            office: { id: office.id, name: office.name }
        });
    } catch (err) {
        console.error("Error registering office:", err);
        res.status(500).json({ error: "Failed to register office" });
    }
});
```

### 3. Verify
- Start the dev server: `npm run dev`
- Test with curl:
  ```bash
  curl -X POST http://localhost:3000/office/register \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Office", "password": "test1234"}'
  ```
- Should return `201` with the office ID and name
- Trying the same name again should return `409`

## Notes
- Case-insensitive name check prevents "MyOffice" and "myoffice" from being separate entries
- Minimum password length is 4 -- keep it simple since this isn't a high-security app
- The password hash is never returned in any response
