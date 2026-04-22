# Ticket 09: Frontend - Pass office context in all API calls

## Summary
Update `public/index.html` to read the office ID from `sessionStorage` and include it in every API call, so the backend knows which office the request belongs to.

## Prerequisites
- Ticket 07 (backend endpoints accept officeId)
- Ticket 08 (lobby page stores officeId in sessionStorage)

## Steps

### 1. Add office context check at the top of the `<script>` block in `index.html`

Right after the `API_BASE` declaration:

```js
// Get office context from session
const officeId = sessionStorage.getItem('officeId');
const officeName = sessionStorage.getItem('officeName');

// Redirect to lobby if not logged in
if (!officeId) {
    window.location.href = '/lobby';
}
```

### 2. Display the office name in the header

After the `<p class="subtitle">` line, add a display for the current office:

```html
<p id="officeDisplay" class="subtitle" style="font-size: 0.9rem; opacity: 0.7;"></p>
```

And in the script, after the office context check:

```js
document.getElementById('officeDisplay').textContent = `Office: ${officeName}`;
```

### 3. Add a logout button

Add after the office display:

```html
<button id="logoutBtn" onclick="logout()" style="font-size: 0.8rem; padding: 0.3rem 0.8rem; margin-bottom: 1rem;">Switch Office</button>
```

And the logout function:

```js
function logout() {
    sessionStorage.removeItem('officeId');
    sessionStorage.removeItem('officeName');
    window.location.href = '/';
}
```

### 4. Update `loadPlayers()`

```js
async function loadPlayers() {
    try {
        const response = await fetch(`${API_BASE}/players?officeId=${officeId}`);
        // ... rest stays the same
    }
}
```

### 5. Update `saveInputSingle()`

Add `officeId` to the request body:

```js
body: JSON.stringify({ winner, loser, officeId })
```

### 6. Update `saveInputTeam()`

Add `officeId` to the request body:

```js
body: JSON.stringify({ winnerAttack, winnerDefense, loserAttack, loserDefense, officeId })
```

### 7. Update `loadStatistics()`

```js
const response = await fetch(`${API_BASE}/stats?officeId=${officeId}`);
```

### 8. Update `loadRecentGames()`

```js
const response = await fetch(`${API_BASE}/recentGames?limit=10&officeId=${officeId}`);
```

### 9. Update delete game handler

```js
const response = await fetch(`${API_BASE}/deleteGame/${gameType}/${gameId}?officeId=${officeId}`, {
    method: 'DELETE'
});
```

### 10. Verify
- Log in via lobby, confirm office name displays in the header
- Save a game, check the DB to confirm `office_id` is set correctly
- Switch offices via the "Switch Office" button
- Confirm players/stats/games are scoped to the logged-in office

## Notes
- Every fetch call that hits the backend now includes the officeId
- POST requests send it in the body, GET/DELETE requests send it as a query parameter
- The redirect to `/lobby` ensures you can't use the app without an office context
