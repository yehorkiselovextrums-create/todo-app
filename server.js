const express = require('express');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'todos_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS todos (id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT, completed BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    console.log('Database initialized');
  } catch (err) {
    console.error('DB error:', err);
  }
}

app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json({status: 'success', data: result.rows, timestamp: new Date().toISOString()});
  } catch (err) {
    res.status(500).json({status: 'error', message: 'Failed to fetch todos', error: err.message});
  }
});

app.post('/api/todos', async (req, res) => {
  const { title, description } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({status: 'error', message: 'Title is required'});
  }
  try {
    const result = await pool.query('INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *', [title, description || '']);
    res.status(201).json({status: 'success', data: result.rows[0], message: 'Todo created', timestamp: new Date().toISOString()});
  } catch (err) {
    res.status(500).json({status: 'error', message: 'Failed to create todo', error: err.message});
  }
});

app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, completed } = req.body;
  try {
    const result = await pool.query('UPDATE todos SET title = COALESCE($1, title), description = COALESCE($2, description), completed = COALESCE($3, completed), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *', [title, description, completed, id]);
    if (result.rows.length === 0) return res.status(404).json({status: 'error', message: 'Todo not found'});
    res.json({status: 'success', data: result.rows[0], message: 'Todo updated', timestamp: new Date().toISOString()});
  } catch (err) {
    res.status(500).json({status: 'error', message: 'Failed to update todo', error: err.message});
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({status: 'error', message: 'Todo not found'});
    res.json({status: 'success', message: 'Todo deleted', data: result.rows[0], timestamp: new Date().toISOString()});
  } catch (err) {
    res.status(500).json({status: 'error', message: 'Failed to delete todo', error: err.message});
  }
});

app.get('/api/health', (req, res) => {
  res.json({status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime()});
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initDatabase();
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.close(() => {
    pool.end();
    process.exit(0);
  });
});