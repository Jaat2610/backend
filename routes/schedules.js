const express = require('express');
const { scheduleController } = require('../controllers');
const { protect, authorize, validateMatch, validateObjectId } = require('../middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Schedule CRUD routes
router
  .route('/')
  .get(scheduleController.getSchedules)
  .post(authorize('coach', 'admin'), validateMatch, scheduleController.createSchedule);

// Team generation
router.post('/:id/generate-team', 
  authorize('coach', 'admin'), 
  validateObjectId(),
  scheduleController.generateTeamSheet
);

// Player-specific schedules
router.get('/player/:playerId', 
  validateObjectId('playerId'),
  scheduleController.getPlayerSchedules
);

router
  .route('/:id')
  .put(authorize('coach', 'admin'), validateObjectId(), validateMatch, scheduleController.updateSchedule)
  .delete(authorize('coach', 'admin'), validateObjectId(), scheduleController.cancelSchedule);

module.exports = router;

