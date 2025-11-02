const express = require('express');
const { playerController } = require('../controllers');
const { protect, authorize } = require('../middleware');

const router = express.Router();

// All routes are protected
router.use(protect);

// Player CRUD routes
router
  .route('/')
  .get(playerController.getPlayers)
  .post(authorize('coach', 'admin'), playerController.createPlayer);

// Special routes before parameterized routes
router.get('/available', playerController.getAvailablePlayers);
router.get('/position/:position', playerController.getPlayersByPosition);

router
  .route('/:id')
  .get(playerController.getPlayer)
  .put(authorize('coach', 'admin'), playerController.updatePlayer)
  .delete(authorize('coach', 'admin'), playerController.deletePlayer);

// Injury management
router.put('/:id/injury',
  authorize('coach', 'admin'),
  playerController.updateInjuryStatus
);

module.exports = router;

