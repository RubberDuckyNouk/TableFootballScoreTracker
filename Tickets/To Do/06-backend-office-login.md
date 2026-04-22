# Ticket 06: Backend - Office login endpoint

## Summary
Add a `POST /office/login` endpoint that verifies office credentials and returns the office ID. The frontend will store the office ID in `sessionStorage` to scope all subsequent requests.

## Prerequisites
- Ticket 01 (offices table)
- Ticket 02 (bcrypt installed)
- Ticket 05 (registration endpoint, so offices exist to log into)

## Steps

### 1. Add the login endpoint in `index.js`

Add this right after the registration endpoint:

```js
// Login to an office
app.post("/office/login", async (req, res) => {
    const { name, password } = req.body;

    if (!name || !password) {
        return res.status(400).json({ error: "Office name and password are required" });
    }

    try {
        const result = await pool.query(
            'SELECT id, name, password_hash FROM offices WHERE LOWER(name) = LOWER($1)',
            [name]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid office name or password" });
        }

        const office = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, office.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid office name or password" });
        }

        res.json({
            success: true,
            message: "Login successful",
            office: { id: office.id, name: office.name }
        });
    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).json({ error: "Failed to login" });
    }
});
```

### 2. Verify
- Register an office first (Ticket 05), then test login:
  ```bash
  curl -X POST http://localhost:3000/office/login \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Office", "password": "test1234"}'
  ```
- Should return `200` with office ID and name
- Wrong password should return `401`
- Non-existent office should return `401` (same error message to avoid info leaks)

## Notes
- This uses a simple approach: the frontend stores `officeId` and `officeName` in `sessionStorage` after login
- We intentionally return the same error for "office not found" and "wrong password" to prevent name enumeration
- No JWT or session cookies needed for now -- this is a low-security app. The office ID is passed as a query param or in the request body
