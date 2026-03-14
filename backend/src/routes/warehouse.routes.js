const router = require('express').Router();
const { getWarehouses, createWarehouse, updateWarehouse, getLocations, createLocation } = require('../controllers/warehouse.controller');
const { protect, requireManager } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getWarehouses);
router.post('/', requireManager, createWarehouse);
router.patch('/:id', requireManager, updateWarehouse);
router.get('/locations', getLocations);
router.post('/locations', requireManager, createLocation);

module.exports = router;
