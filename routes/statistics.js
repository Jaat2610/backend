const express = require('express');
const { statisticsController } = require('../controllers');
const { protect, authorize, validateStatistics, validateObjectId } = require('../middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Statistics and reports routes
router.get('/player/:id', 
  validateObjectId(),
  statisticsController.getPlayerStats
);

router.get('/match/:id', 
  validateObjectId(),
  statisticsController.getMatchStats
);

router.get('/team', 
  statisticsController.getTeamStats
);

// Injury logging
router.post('/log-injury', 
  authorize('coach', 'admin'), 
  validateStatistics,
  statisticsController.logInjury
);

module.exports = router;

