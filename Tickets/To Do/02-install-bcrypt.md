# Ticket 02: Install bcrypt for password hashing

## Summary
Add `bcrypt` as a dependency for securely hashing office passwords.

## Why
Office passwords must be stored as hashes, never in plain text. bcrypt is the standard choice for password hashing in Node.js.

## Steps

### 1. Install the package
```bash
npm install bcrypt
```

### 2. Verify
- Check `package.json` to confirm `bcrypt` is listed under `dependencies`
- Quick test in Node REPL:
  ```js
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('test', 10);
  console.log(hash); // Should print a hash string
  const match = await bcrypt.compare('test', hash);
  console.log(match); // Should print true
  ```

## Notes
- Use a salt rounds value of `10` (good balance between security and speed)
- If `bcrypt` fails to install on your machine (native compilation issues), use `bcryptjs` as a pure JS fallback: `npm install bcryptjs` -- the API is identical
