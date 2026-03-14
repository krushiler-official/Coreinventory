require('dotenv').config();
const app = require('./app');
const db = require('../db');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 CoreInventory API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);

  db.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('DB health check failed:', err);
    } else {
      console.log('DB health check:', res.rows);
    }
  });
});
