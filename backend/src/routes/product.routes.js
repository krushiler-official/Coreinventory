const router = require('express').Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories } = require('../controllers/product.controller');
const { protect, requireManager } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.patch('/:id', updateProduct);
router.delete('/:id', requireManager, deleteProduct);

module.exports = router;
