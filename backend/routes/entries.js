const express = require('express');
const { db }  = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const VALID_TYPES = [
  'Published news',
  'Rumors',
  'Published Results',
  'Recommendation',
  'Exchange fillings',
  'Corporate actions',
  'Promoter transactions',
  'Bulk / Block deals'
];

const VALID_RATINGS = ['A', 'B', 'C', 'D'];

// POST /api/entries — submit a new entry (auth required)
router.post('/', authenticate, async (req, res) => {
  try {
    const { entry_date, stock_name, stock_symbol, sector, type, source, news, rating, opinion, investor_name } = req.body;

    if (!entry_date || !stock_name || !stock_symbol || !sector || !type || !source || !news) {
      return res.status(400).json({ error: 'entry_date, stock_name, stock_symbol, sector, type, source, and news are required' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid type value' });
    }
    if (rating && !VALID_RATINGS.includes(rating)) {
      return res.status(400).json({ error: 'Rating must be A, B, C, or D' });
    }

    const insert = await db.execute({
      sql: `INSERT INTO entries (user_id, entry_date, stock_name, stock_symbol, sector, type, source, news, rating, opinion, investor_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        req.user.id,
        entry_date,
        stock_name.trim(),
        stock_symbol.trim().toUpperCase(),
        sector.trim(),
        type,
        source.trim(),
        news.trim(),
        rating || null,
        opinion ? opinion.trim() : null,
        investor_name ? investor_name.trim() : null
      ]
    });

    const newId = Number(insert.lastInsertRowid);
    const entry = await db.execute({
      sql: `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
      args: [newId]
    });

    res.status(201).json(entry.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/entries — get all entries with optional search/filter (public)
router.get('/', async (req, res) => {
  try {
    const { q, stock, sector, type, source, rating, date_from, date_to, page = 1, limit = 20 } = req.query;

    const where = [];
    const params = [];

    if (q) {
      where.push('(e.news LIKE ? OR e.opinion LIKE ? OR e.source LIKE ? OR e.stock_name LIKE ? OR e.stock_symbol LIKE ? OR u.username LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like, like, like, like);
    }
    if (stock) {
      where.push('(e.stock_symbol LIKE ? OR e.stock_name LIKE ?)');
      const stockLike = `%${stock.toUpperCase()}%`;
      params.push(stockLike, stockLike);
    }
    if (sector) {
      where.push('e.sector = ?');
      params.push(sector);
    }
    if (type) {
      where.push('e.type = ?');
      params.push(type);
    }
    if (source) {
      where.push('e.source = ?');
      params.push(source);
    }
    if (rating) {
      where.push('e.rating = ?');
      params.push(rating);
    }
    if (date_from) {
      where.push('e.entry_date >= ?');
      params.push(date_from);
    }
    if (date_to) {
      where.push('e.entry_date <= ?');
      params.push(date_to);
    }

    const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM entries e JOIN users u ON e.user_id = u.id ${whereSQL}`,
      args: params
    });
    const total = Number(countResult.rows[0].count);

    const entriesResult = await db.execute({
      sql: `SELECT e.*, u.username FROM entries e
            JOIN users u ON e.user_id = u.id
            ${whereSQL}
            ORDER BY e.submitted_at DESC
            LIMIT ? OFFSET ?`,
      args: [...params, parseInt(limit), offset]
    });

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      entries: entriesResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/entries/:id — get single entry (public)
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
      args: [req.params.id]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const ADMINS = ['Aaryan', 'raunak bajaj'];

// PUT /api/entries/:id — edit entry (admins or entry owner)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT * FROM entries WHERE id = ?',
      args: [req.params.id]
    });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });

    const isAdmin = ADMINS.includes(req.user.username);
    const isOwner = Number(existing.rows[0].user_id) === req.user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You do not have permission to edit this entry' });
    }

    const { entry_date, stock_name, stock_symbol, sector, type, source, news, opinion, investor_name } = req.body;
    const rating = isAdmin ? req.body.rating : existing.rows[0].rating;

    if (!entry_date || !stock_name || !stock_symbol || !sector || !type || !source || !news) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid type value' });
    }
    if (rating && !VALID_RATINGS.includes(rating)) {
      return res.status(400).json({ error: 'Rating must be A, B, C, or D' });
    }

    await db.execute({
      sql: `UPDATE entries SET
              entry_date = ?, stock_name = ?, stock_symbol = ?, sector = ?,
              type = ?, source = ?, news = ?, rating = ?, opinion = ?, investor_name = ?,
              edited_at = datetime('now', 'localtime')
            WHERE id = ?`,
      args: [
        entry_date,
        stock_name.trim(),
        stock_symbol.trim().toUpperCase(),
        sector.trim(),
        type,
        source.trim(),
        news.trim(),
        rating || null,
        opinion ? opinion.trim() : null,
        investor_name ? investor_name.trim() : null,
        req.params.id
      ]
    });

    const updated = await db.execute({
      sql: `SELECT e.*, u.username FROM entries e JOIN users u ON e.user_id = u.id WHERE e.id = ?`,
      args: [req.params.id]
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/entries/:id — delete own entry (auth required)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM entries WHERE id = ?',
      args: [req.params.id]
    });
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    if (!ADMINS.includes(req.user.username) && Number(result.rows[0].user_id) !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }

    await db.execute({ sql: 'DELETE FROM entries WHERE id = ?', args: [req.params.id] });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
