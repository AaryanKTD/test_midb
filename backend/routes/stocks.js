const express = require('express');
const path = require('path');
const stocksData = require('../data/stocks.json');

const router = express.Router();

// GET /api/stocks — return all stocks (optionally filtered by sector)
router.get('/', (req, res) => {
  const { sector } = req.query;
  if (sector) {
    const filtered = stocksData.stocks.filter(s => s.sector === sector);
    return res.json(filtered);
  }
  res.json(stocksData.stocks);
});

// GET /api/stocks/sectors — return all unique sectors
router.get('/sectors', (req, res) => {
  res.json(stocksData.sectors);
});

module.exports = router;
