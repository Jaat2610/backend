const express = require('express');
const { getMatches, getMatch, startMatch, startExistingMatch, makeSubstitution, getPlaytimeStats, endMatch } = require('../controllers/matchController');
const { protect, authorize, validateMatch, validateSubstitution, validateObjectId } = require('../middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Match management routes
router
  .route('/')
  .get(getMatches);

// Live match functionality
router.post('/start',
  authorize('coach', 'admin'),
  validateMatch,
  startMatch
);

// Start an existing scheduled match
router.put('/:id/start',
  authorize('coach', 'admin'),
  validateObjectId(),
  startExistingMatch
);

router
  .route('/:id')
  .get(validateObjectId(), getMatch);

// Live substitution and match control
router.post('/:id/substitute',
  authorize('coach', 'admin'),
  validateObjectId(),
  validateSubstitution,
  makeSubstitution
);

router.get('/:id/playtime',
  validateObjectId(),
  getPlaytimeStats
);

router.put('/:id/end',
  authorize('coach', 'admin'),
  validateObjectId(),
  endMatch
);

module.exports = router;

