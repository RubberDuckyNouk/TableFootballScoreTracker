# Ticket 08: Frontend - Create lobby page

## Summary
Create a `public/lobby.html` page that serves as the entry point. Users can log in to an existing office or register a new one. After successful login/register, redirect to the main app.

## Prerequisites
- Ticket 05 (registration endpoint)
- Ticket 06 (login endpoint)

## Steps

### 1. Create `public/lobby.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Table Turns - Choose Your Office</title>
    <link rel="stylesheet" href="public/style.css">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <h1>Table Turns</h1>
    <p class="subtitle">The competitive table football app</p>

    <div style="width: 100%; max-width: 400px; margin: 2rem auto;">
        <!-- Toggle between Login and Register -->
        <div class="toggle-container">
            <button class="toggle-btn active" onclick="showLogin()">Login</button>
            <button class="toggle-btn" onclick="showRegister()">Register</button>
        </div>

        <!-- Login Form -->
        <section id="loginSection" class="game-section">
            <h2>Office Login</h2>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <input type="text" id="loginName" class="player-input" placeholder="Office Name" autocomplete="off">
                <input type="password" id="loginPassword" class="player-input" placeholder="Password">
                <button onclick="loginOffice()">Login</button>
                <p id="loginStatus"></p>
            </div>
        </section>

        <!-- Register Form -->
        <section id="registerSection" class="game-section" style="display: none;">
            <h2>Register Office</h2>
            <div style="display: flex; flex-direction: column; gap: 1rem;">
                <input type="text" id="registerName" class="player-input" placeholder="Office Name" autocomplete="off">
                <input type="password" id="registerPassword" class="player-input" placeholder="Password (min 4 characters)">
                <button onclick="registerOffice()">Register</button>
                <p id="registerStatus"></p>
            </div>
        </section>
    </div>

    <script>
        const API_BASE = window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : 'https://tablefootballscoretracker.onrender.com';

        // Check if already logged in
        window.addEventListener('DOMContentLoaded', () => {
            const officeId = sessionStorage.getItem('officeId');
            if (officeId) {
                window.location.href = '/';
            }
        });

        function showLogin() {
            document.getElementById('loginSection').style.display = 'flex';
            document.getElementById('registerSection').style.display = 'none';
            const btns = document.querySelectorAll('.toggle-btn');
            btns[0].classList.add('active');
            btns[1].classList.remove('active');
        }

        function showRegister() {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('registerSection').style.display = 'flex';
            const btns = document.querySelectorAll('.toggle-btn');
            btns[0].classList.remove('active');
            btns[1].classList.add('active');
        }

        async function loginOffice() {
            const name = document.getElementById('loginName').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!name || !password) {
                document.getElementById('loginStatus').textContent = 'Please fill in both fields';
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/office/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password })
                });

                const data = await response.json();

                if (response.ok) {
                    sessionStorage.setItem('officeId', data.office.id);
                    sessionStorage.setItem('officeName', data.office.name);
                    window.location.href = '/';
                } else {
                    document.getElementById('loginStatus').textContent = data.error;
                }
            } catch (err) {
                console.error('Login error:', err);
                document.getElementById('loginStatus').textContent = 'Connection error. Try again.';
            }
        }

        async function registerOffice() {
            const name = document.getElementById('registerName').value.trim();
            const password = document.getElementById('registerPassword').value;

            if (!name || !password) {
                document.getElementById('registerStatus').textContent = 'Please fill in both fields';
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/office/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Auto-login after registration
                    sessionStorage.setItem('officeId', data.office.id);
                    sessionStorage.setItem('officeName', data.office.name);
                    window.location.href = '/';
                } else {
                    document.getElementById('registerStatus').textContent = data.error;
                }
            } catch (err) {
                console.error('Register error:', err);
                document.getElementById('registerStatus').textContent = 'Connection error. Try again.';
            }
        }
    </script>
</body>
</html>
```

### 2. Update the root route in `index.js`

Change the `/` route to serve `lobby.html` instead of `index.html`:

```js
// Serve the lobby page at root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "lobby.html"));
});

// Serve the main app at /app
app.get("/app", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
```

### 3. Update the lobby redirect target
In the `lobby.html` script above, change `window.location.href = '/'` to `window.location.href = '/app'` (in both `loginOffice` and `registerOffice` functions).

### 4. Verify
- Navigate to `http://localhost:3000/` -- should show lobby
- Register an office, should redirect to `/app`
- Close tab, open again -- should redirect from lobby to app (sessionStorage persists per tab)
- Open in a new tab -- should show lobby again (sessionStorage is per-tab)

## Notes
- `sessionStorage` is used instead of `localStorage` so each tab can be logged into a different office if needed
- The lobby reuses existing CSS classes from `style.css` for consistent styling
- After login, the office ID and name are available via `sessionStorage.getItem('officeId')` and `sessionStorage.getItem('officeName')`
