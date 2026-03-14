const router = require('express').Router();
const {
  getOperations, getOperation,
  createReceipt, createDelivery, createTransfer, createAdjustment,
  validateOperation, cancelOperation,
} = require('../controllers/operation.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getOperations);
router.get('/:id', getOperation);
router.post('/receipts', createReceipt);
router.post('/deliveries', createDelivery);
router.post('/transfers', createTransfer);
router.post('/adjustments', createAdjustment);
router.patch('/:id/validate', validateOperation);
router.patch('/:id/cancel', cancelOperation);

module.exports = router;
