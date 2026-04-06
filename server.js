const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Database initialized');
  } finally {
    client.release();
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

app.post('/api/todos', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

app.patch('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { completed, title } = req.body;
  
  try {
    let query = 'UPDATE todos SET ';
    const values = [];
    let paramCount = 1;
    
    if (completed !== undefined) {
      query += `completed = $${paramCount}`;
      values.push(completed);
      paramCount++;
    }
    
    if (title !== undefined && title.trim()) {
      if (paramCount > 1) query += ', ';
      query += `title = $${paramCount}`;
      values.push(title.trim());
      paramCount++;
    }
    
    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(id);
    
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});