const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[DealFlow360 Server] Running on http://localhost:${PORT}`);
  console.log(`[DealFlow360 Server] Allowed client origin: ${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}`);
});

process.on('unhandledRejection', (err) => {
  console.error('[DealFlow360 Server] Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[DealFlow360 Server] Uncaught Exception:', err);
  process.exit(1);
});

module.exports = server;
