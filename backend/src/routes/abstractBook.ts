import { Router } from 'express';
import { AbstractBookController } from '../controllers/AbstractBookController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const abstractBookController = new AbstractBookController();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// Preview abstract book data (metadata and summary)
router.get('/preview', abstractBookController.previewAbstractBook.bind(abstractBookController));

// Generate and download abstract book
router.post('/generate', abstractBookController.generateAbstractBook.bind(abstractBookController));

// Save abstract book to server
router.post('/save', abstractBookController.saveAbstractBook.bind(abstractBookController));

// Get default template for customization
router.get('/template/default', abstractBookController.getDefaultTemplate.bind(abstractBookController));

// Get available filter options
router.get('/filters', abstractBookController.getFilterOptions.bind(abstractBookController));

// List saved abstract books
router.get('/saved', abstractBookController.listAbstractBooks.bind(abstractBookController));

// Download saved abstract book
router.get('/download/:filename', abstractBookController.downloadAbstractBook.bind(abstractBookController));

export default router;