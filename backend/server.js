const express = require('express');
const cors    = require('cors');
const os      = require('os');
const { init } = require('./db/database');

const authRoutes    = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const stocksRoutes  = require('./routes/stocks');

const app  = express();
const PORT = 7777;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address;
      }
    }
  }
  return 'localhost';
}

app.use(cors({ origin: '*' }));
app.use(express.json());

app.use('/api/auth',    authRoutes);
app.use('/api/entries', entriesRoutes);
app.use('/api/stocks',  stocksRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Init DB first, then start server
init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`\nMIDB Backend running:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://${ip}:${PORT}\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
