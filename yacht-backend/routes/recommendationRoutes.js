const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middlewares/authMiddleware');


router.use(protect);

router.post('/generate', recommendationController.generateRecommendations);
router.get('/my-recommendations', recommendationController.getMyRecommendations);
router.put('/:id/view', recommendationController.markAsViewed);
router.put('/:id/dismiss', recommendationController.dismissRecommendation);
router.get('/analyze/:yachtId', recommendationController.analyzeYacht);

module.exports = router;