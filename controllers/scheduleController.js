const { Match, Player, Statistics } = require('../models');
const moment = require('moment');

// @desc    Get all schedules (matches and training)
// @route   GET /api/schedules
// @access  Private
const getSchedules = async (req, res, next) => {
  try {
    // Build query
    let query = {};

    // Filter by type if specified
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by date range - default to next 30 days
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : moment().add(30, 'days').toDate();

    query.date = {
      $gte: startDate,
      $lte: endDate
    };

    // Filter by status if specified
    if (req.query.status) {
      query.status = req.query.status;
    }

    const schedules = await Match.find(query)
      .populate('teamSheet', 'name jerseyNumber position')
      .sort({ date: 1 })
      .select('date type status opponent venue duration teamSheet notes');

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new match/training event
// @route   POST /api/schedules
// @access  Private
const createSchedule = async (req, res, next) => {
  try {
    const scheduleData = {
      ...req.body,
      status: 'scheduled'
    };

    // Validate team sheet if provided
    if (scheduleData.teamSheet && scheduleData.teamSheet.length > 0) {
      const players = await Player.find({
        _id: { $in: scheduleData.teamSheet },
        availability: true
      });

      if (players.length !== scheduleData.teamSheet.length) {
        return res.status(400).json({
          success: false,
          message: 'Some players in the team sheet are not available'
        });
      }
    }

    const schedule = await Match.create(scheduleData);

    await schedule.populate('teamSheet', 'name jerseyNumber position');

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-generate team sheet based on rotations and availability
// @route   POST /api/schedules/:id/generate-team
// @access  Private
const generateTeamSheet = async (req, res, next) => {
  try {
    const { formationPreference, prioritizeRest } = req.body;
    const matchId = req.params.id;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (match.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Can only generate team sheet for scheduled matches'
      });
    }

    // Get all available players
    const availablePlayers = await Player.find({
      availability: true,
      injuryStatus: { $in: ['Healthy', 'Minor Injury'] }
    });

    if (availablePlayers.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'Not enough available players for a full team'
      });
    }

    // Get recent playtime statistics for rotation
    const recentMatches = await Match.find({
      date: {
        $gte: moment().subtract(30, 'days').toDate(),
        $lt: match.date
      },
      status: 'completed'
    });

    // Calculate total playtime for each player in recent matches
    const playerPlaytime = {};
    availablePlayers.forEach(player => {
      playerPlaytime[player._id] = 0;
    });

    recentMatches.forEach(recentMatch => {
      recentMatch.playtime.forEach((minutes, playerId) => {
        if (playerPlaytime[playerId] !== undefined) {
          playerPlaytime[playerId] += minutes;
        }
      });
    });

    // Generate team based on formation and rotation
    const formation = formationPreference || '4-4-2';
    const teamSheet = generateOptimalTeam(availablePlayers, playerPlaytime, formation, prioritizeRest);

    // Update match with generated team sheet
    match.teamSheet = teamSheet.map(player => player._id);
    await match.save();

    await match.populate('teamSheet', 'name jerseyNumber position');

    res.status(200).json({
      success: true,
      data: {
        match,
        generatedTeam: teamSheet,
        formation: formation,
        rotationInfo: {
          totalAvailablePlayers: availablePlayers.length,
          playersSelected: teamSheet.length,
          rotationPriority: prioritizeRest ? 'Rest-based' : 'Balanced'
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get upcoming matches for a specific player
// @route   GET /api/schedules/player/:playerId
// @access  Private
const getPlayerSchedules = async (req, res, next) => {
  try {
    const { playerId } = req.params;

    // Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    const schedules = await Match.find({
      teamSheet: playerId,
      date: { $gte: new Date() },
      status: { $in: ['scheduled', 'ongoing'] }
    }).sort({ date: 1 });

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private
const updateSchedule = async (req, res, next) => {
  try {
    let schedule = await Match.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Prevent updating completed or ongoing matches
    if (schedule.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed matches'
      });
    }

    // Validate team sheet if being updated
    if (req.body.teamSheet) {
      const players = await Player.find({
        _id: { $in: req.body.teamSheet },
        availability: true
      });

      if (players.length !== req.body.teamSheet.length) {
        return res.status(400).json({
          success: false,
          message: 'Some players in the team sheet are not available'
        });
      }
    }

    schedule = await Match.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('teamSheet', 'name jerseyNumber position');

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel schedule
// @route   DELETE /api/schedules/:id
// @access  Private
const cancelSchedule = async (req, res, next) => {
  try {
    const schedule = await Match.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (schedule.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed matches'
      });
    }

    if (schedule.status === 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel ongoing matches. End the match first.'
      });
    }

    await Match.findByIdAndUpdate(req.params.id, { status: 'cancelled' });

    res.status(200).json({
      success: true,
      message: 'Schedule cancelled successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to generate optimal team based on formation and rotation
function generateOptimalTeam(availablePlayers, playerPlaytime, formation, prioritizeRest) {
  // Parse formation (e.g., "4-4-2" -> [4, 4, 2])
  const formationArray = formation.split('-').map(num => parseInt(num));
  const [defenders, midfielders, forwards] = formationArray;
  const goalkeepers = 1; // Always need 1 goalkeeper

  // Separate players by position
  const playersByPosition = {
    Goalkeeper: availablePlayers.filter(p => p.position === 'Goalkeeper'),
    Defender: availablePlayers.filter(p => p.position === 'Defender' || p.preferredPositions.includes('Defender')),
    Midfielder: availablePlayers.filter(p => p.position === 'Midfielder' || p.preferredPositions.includes('Midfielder')),
    Forward: availablePlayers.filter(p => p.position === 'Forward' || p.preferredPositions.includes('Forward'))
  };

  // Sort players by playtime (ascending for rotation)
  Object.keys(playersByPosition).forEach(position => {
    playersByPosition[position].sort((a, b) => {
      if (prioritizeRest) {
        return playerPlaytime[a._id] - playerPlaytime[b._id]; // Less playtime first
      } else {
        // Balanced approach - consider both playtime and preferred position
        const aPlaytime = playerPlaytime[a._id] || 0;
        const bPlaytime = playerPlaytime[b._id] || 0;
        const aPreferred = a.position === position ? 0 : 1;
        const bPreferred = b.position === position ? 0 : 1;
        
        return (aPlaytime + aPreferred * 10) - (bPlaytime + bPreferred * 10);
      }
    });
  });

  const selectedTeam = [];

  // Select players by position
  const requirements = {
    Goalkeeper: goalkeepers,
    Defender: defenders,
    Midfielder: midfielders,
    Forward: forwards
  };

  Object.keys(requirements).forEach(position => {
    const needed = requirements[position];
    const available = playersByPosition[position];
    
    for (let i = 0; i < needed && i < available.length; i++) {
      selectedTeam.push(available[i]);
    }
  });

  // If we don't have enough players in specific positions, fill with versatile players
  const totalNeeded = goalkeepers + defenders + midfielders + forwards;
  if (selectedTeam.length < totalNeeded) {
    const remainingPlayers = availablePlayers.filter(p => !selectedTeam.includes(p));
    remainingPlayers.sort((a, b) => playerPlaytime[a._id] - playerPlaytime[b._id]);
    
    while (selectedTeam.length < totalNeeded && remainingPlayers.length > 0) {
      selectedTeam.push(remainingPlayers.shift());
    }
  }

  return selectedTeam.slice(0, 11); // Ensure we don't exceed 11 players
}

module.exports = {
  getSchedules,
  createSchedule,
  generateTeamSheet,
  getPlayerSchedules,
  updateSchedule,
  cancelSchedule
};

