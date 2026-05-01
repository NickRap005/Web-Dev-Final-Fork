const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('mydata.db');

// Serve your HTML files from a "public" folder
app.use(express.static('public'));
app.use(express.json());

// Create a table (runs once)
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )
`);

// Example API routes
app.get('/api/items', (req, res) => {
  const items = db.prepare('SELECT * FROM items').all();
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const { name } = req.body;
  const result = db.prepare('INSERT INTO items (name) VALUES (?)').run(name);
  res.json({ id: result.lastInsertRowid, name });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));