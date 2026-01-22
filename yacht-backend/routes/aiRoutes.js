const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const {
  analyzeUserPreferences,
  getAIRecommendations,
  chatWithAI
} = require('../controllers/aiRecommendationController');

router.post('/analyze-preferences', protect, analyzeUserPreferences);
router.post('/recommendations', protect, getAIRecommendations);
router.post('/chat', protect, chatWithAI);

module.exports = router;
