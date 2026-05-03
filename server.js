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

// Create leaderboard tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    points INTEGER NOT NULL,
    language TEXT NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`);

// Get or create a user by name, returns their id
app.post('/api/users', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  const clean = name.trim();
  
  let user = db.prepare('SELECT * FROM users WHERE name = ?').get(clean);
  if (!user) {
    const result = db.prepare('INSERT INTO users (name) VALUES (?)').run(clean);
    user = { id: result.lastInsertRowid, name: clean };
  }
  res.json(user);
});

// Submit a score
app.post('/api/scores', (req, res) => {
  const { user_id, points, language, total_questions } = req.body;
  if (!user_id || points == null || !language || !total_questions) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const result = db.prepare(
    'INSERT INTO scores (user_id, points, language, total_questions) VALUES (?, ?, ?, ?)'
  ).run(user_id, points, language, total_questions);
  res.json({ id: result.lastInsertRowid });
});

// Get leaderboard — best score per user per language, top 10
app.get('/api/leaderboard', (req, res) => {
  const { language } = req.query;
  const lang = language || 'spanish';
  const rows = db.prepare(`
    SELECT u.name, MAX(s.points) as best_score, s.total_questions,
           COUNT(s.id) as games_played
    FROM scores s
    JOIN users u ON u.id = s.user_id
    WHERE s.language = ?
    GROUP BY s.user_id
    ORDER BY best_score DESC, games_played ASC
    LIMIT 10
  `).all(lang);
  res.json(rows);
});