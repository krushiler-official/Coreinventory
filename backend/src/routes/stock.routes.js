const router = require('express').Router();
const { getStockByLocation, getMoveHistory } = require('../controllers/stock.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getStockByLocation);
router.get('/moves', getMoveHistory);

module.exports = router;
