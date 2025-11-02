const { Match, Player, Statistics } = require('../models');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Private
const getMatches = async (req, res, next) => {
  try {
    // Build query
    let query = {};

    // Filter by type if specified
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Filter by status if specified
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) {
        query.date.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.date.$lte = new Date(req.query.endDate);
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    // Execute query with population
    const matches = await Match.find(query)
      .populate('teamSheet', 'name jerseyNumber position')
      .populate('substitutions.playerIn', 'name jerseyNumber')
      .populate('substitutions.playerOut', 'name jerseyNumber')
      .sort({ date: -1 })
      .limit(limit)
      .skip(startIndex);

    const total = await Match.countDocuments(query);

    // Pagination result
    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: matches.length,
      total,
      pagination,
      data: matches
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start an existing scheduled match
// @route   PUT /api/matches/:id/start
// @access  Private
const startExistingMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot start match with status: ${match.status}. Only scheduled matches can be started.`
      });
    }

    // Update match status to ongoing
    match.status = 'ongoing';
    await match.save();

    // Populate the match with team sheet details
    await match.populate('teamSheet', 'name jerseyNumber position');

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single match
// @route   GET /api/matches/:id
// @access  Private
const getMatch = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teamSheet', 'name jerseyNumber position')
      .populate('substitutions.playerIn', 'name jerseyNumber')
      .populate('substitutions.playerOut', 'name jerseyNumber');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start a new match
// @route   POST /api/matches/start
// @access  Private
const startMatch = async (req, res, next) => {
  try {
    const { teamSheet, ...matchData } = req.body;

    // Validate team sheet players exist and are available
    if (teamSheet && teamSheet.length > 0) {
      const players = await Player.find({
        _id: { $in: teamSheet },
        availability: true
      });

      if (players.length !== teamSheet.length) {
        return res.status(400).json({
          success: false,
          message: 'Some players in the team sheet are not available'
        });
      }
    }

    // Create match with ongoing status
    const match = await Match.create({
      ...matchData,
      teamSheet: teamSheet || [],
      status: 'ongoing'
    });

    // Initialize playtime for all players in team sheet
    if (teamSheet && teamSheet.length > 0) {
      teamSheet.forEach(playerId => {
        match.updatePlayerPlaytime(playerId, 0);
      });
      await match.save();
    }

    // Populate the created match
    await match.populate('teamSheet', 'name jerseyNumber position');

    res.status(201).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Make a substitution
// @route   POST /api/matches/:id/substitute
// @access  Private
const makeSubstitution = async (req, res, next) => {
  try {
    const { playerIn, playerOut, time, reason, injuryStatus, injuryNotes } = req.body;
    const matchId = req.params.id;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Can only make substitutions during ongoing matches'
      });
    }

    // Validate players exist
    const [playerInDoc, playerOutDoc] = await Promise.all([
      Player.findById(playerIn),
      Player.findById(playerOut)
    ]);

    if (!playerInDoc || !playerOutDoc) {
      return res.status(404).json({
        success: false,
        message: 'One or both players not found'
      });
    }

    // Check if playerOut is actually in the current team sheet
    if (!match.teamSheet.includes(playerOut)) {
      return res.status(400).json({
        success: false,
        message: 'Player to be substituted is not currently on the field'
      });
    }

    // Check if playerIn is already on the field
    if (match.teamSheet.includes(playerIn)) {
      return res.status(400).json({
        success: false,
        message: 'Player coming in is already on the field'
      });
    }

    // Calculate current playtime for playerOut (time from match start to substitution)
    const substitutionTime = time ? new Date(time) : new Date();
    const matchStart = match.createdAt;
    const minutesPlayed = Math.floor((substitutionTime - matchStart) / (1000 * 60));

    // Update playtime for playerOut
    const currentPlaytime = match.getPlayerPlaytime(playerOut);
    match.updatePlayerPlaytime(playerOut, currentPlaytime + minutesPlayed);

    // Initialize playtime for playerIn
    match.updatePlayerPlaytime(playerIn, match.getPlayerPlaytime(playerIn));

    // Update team sheet
    const teamSheetIndex = match.teamSheet.indexOf(playerOut);
    match.teamSheet[teamSheetIndex] = playerIn;

    // Add substitution record
    match.substitutions.push({
      playerIn,
      playerOut,
      time: substitutionTime,
      reason: reason || 'Tactical substitution'
    });

    // Update player injury status if this is an injury substitution
    if (reason && reason.toLowerCase().includes('injury') && injuryStatus) {
      try {
        await Player.findByIdAndUpdate(playerOut, {
          injuryStatus: injuryStatus,
          injuryNotes: injuryNotes || `Injured during match on ${new Date().toLocaleDateString()}`
        });
        console.log(`Updated player ${playerOut} injury status to: ${injuryStatus}`);
      } catch (error) {
        console.error('Failed to update player injury status:', error);
        // Don't fail the substitution if injury update fails
      }
    }

    await match.save();

    // Populate and return updated match
    await match.populate([
      { path: 'teamSheet', select: 'name jerseyNumber position' },
      { path: 'substitutions.playerIn', select: 'name jerseyNumber' },
      { path: 'substitutions.playerOut', select: 'name jerseyNumber' }
    ]);

    // Emit real-time update via Socket.io (optional - only if Socket.io is configured)
    try {
      const socketio = req.app.get('socketio');
      if (socketio) {
        socketio.emit('substitution', {
          matchId: match._id,
          substitution: match.substitutions[match.substitutions.length - 1],
          playtime: Object.fromEntries(match.playtime)
        });

        // Check for playtime fairness and emit alerts if needed
        const playtimeAlert = checkPlaytimeFairness(match);
        if (playtimeAlert) {
          socketio.emit('playtime_alert', {
            matchId: match._id,
            alert: playtimeAlert
          });
        }
      }
    } catch (error) {
      console.log('Socket.io not configured, skipping real-time updates');
    }

    res.status(200).json({
      success: true,
      data: match
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current playtime stats for a match
// @route   GET /api/matches/:id/playtime
// @access  Private
const getPlaytimeStats = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teamSheet', 'name jerseyNumber position');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Calculate current playtime for ongoing match
    if (match.status === 'ongoing') {
      const now = new Date();
      const matchStart = match.createdAt;
      const currentMatchTime = Math.floor((now - matchStart) / (1000 * 60));

      // Update playtime for current team sheet players
      match.teamSheet.forEach(playerId => {
        const lastSubstitution = match.substitutions
          .filter(sub => sub.playerIn.toString() === playerId.toString())
          .sort((a, b) => b.time - a.time)[0];

        const startTime = lastSubstitution ? lastSubstitution.time : matchStart;
        const timePlayed = Math.floor((now - startTime) / (1000 * 60));
        
        match.updatePlayerPlaytime(
          playerId,
          match.getPlayerPlaytime(playerId) + timePlayed
        );
      });
    }

    // Get all players who have played
    const allPlayerIds = Array.from(match.playtime.keys());
    const players = await Player.find({ _id: { $in: allPlayerIds } });

    const playtimeStats = players.map(player => ({
      player: {
        _id: player._id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        position: player.position
      },
      minutesPlayed: match.getPlayerPlaytime(player._id),
      isCurrentlyPlaying: match.teamSheet.includes(player._id)
    }));

    // Sort by minutes played descending
    playtimeStats.sort((a, b) => b.minutesPlayed - a.minutesPlayed);

    // Fair play analysis
    const totalMinutes = playtimeStats.reduce((sum, stat) => sum + stat.minutesPlayed, 0);
    const averageMinutes = totalMinutes / playtimeStats.length;
    const maxMinutes = Math.max(...playtimeStats.map(stat => stat.minutesPlayed));
    const minMinutes = Math.min(...playtimeStats.map(stat => stat.minutesPlayed));

    const fairPlay = {
      averageMinutes: Math.round(averageMinutes),
      maxMinutes,
      minMinutes,
      difference: maxMinutes - minMinutes,
      isFair: (maxMinutes - minMinutes) <= 15 // Consider fair if difference is <= 15 minutes
    };

    res.status(200).json({
      success: true,
      data: {
        match: {
          _id: match._id,
          type: match.type,
          date: match.date,
          status: match.status,
          duration: match.duration
        },
        playtimeStats,
        fairPlay,
        totalPlayersUsed: playtimeStats.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    End a match with results and player performances
// @route   PUT /api/matches/:id/end
// @access  Private
const endMatch = async (req, res, next) => {
  try {
    const { matchResult, playerPerformances } = req.body;
    const match = await Match.findById(req.params.id).populate('teamSheet', 'name jerseyNumber position');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    if (match.status !== 'ongoing') {
      return res.status(400).json({
        success: false,
        message: 'Match is not currently ongoing'
      });
    }

    // Calculate final playtime for all current players
    const now = new Date();
    const matchStart = match.createdAt;

    match.teamSheet.forEach(playerId => {
      const lastSubstitution = match.substitutions
        .filter(sub => sub.playerIn.toString() === playerId.toString())
        .sort((a, b) => b.time - a.time)[0];

      const startTime = lastSubstitution ? lastSubstitution.time : matchStart;
      const timePlayed = Math.floor((now - startTime) / (1000 * 60));
      
      match.updatePlayerPlaytime(
        playerId,
        match.getPlayerPlaytime(playerId) + timePlayed
      );
    });

    // Update match status
    match.status = 'completed';

    // For training sessions, just complete without match result
    if (match.type === 'training') {
      // Still record player performances if provided
      if (playerPerformances && Array.isArray(playerPerformances)) {
        playerPerformances.forEach(performance => {
          if (performance.playerId) {
            match.updatePlayerPerformance(performance.playerId, {
              goals: performance.goals || 0,
              assists: performance.assists || 0,
              yellowCards: performance.yellowCards || 0,
              redCards: performance.redCards || 0,
              rating: performance.rating || null,
              playerOfMatch: performance.playerOfMatch || false,
              minutesPlayed: match.getPlayerPlaytime(performance.playerId)
            });
          }
        });
      }
    } 
    // For matches, require match result
    else if (match.type === 'match') {
      if (!matchResult) {
        return res.status(400).json({
          success: false,
          message: 'Match result is required when ending a match'
        });
      }

      // Validate match result
      if (!['win', 'loss', 'draw'].includes(matchResult.result)) {
        return res.status(400).json({
          success: false,
          message: 'Match result must be win, loss, or draw'
        });
      }

      // Set match result
      match.matchResult = {
        result: matchResult.result,
        ourScore: matchResult.ourScore || 0,
        opponentScore: matchResult.opponentScore || 0
      };

      // Update player performances
      if (playerPerformances && Array.isArray(playerPerformances)) {
        playerPerformances.forEach(performance => {
          if (performance.playerId) {
            match.updatePlayerPerformance(performance.playerId, {
              goals: performance.goals || 0,
              assists: performance.assists || 0,
              yellowCards: performance.yellowCards || 0,
              redCards: performance.redCards || 0,
              rating: performance.rating || null,
              playerOfMatch: performance.playerOfMatch || false,
              minutesPlayed: match.getPlayerPlaytime(performance.playerId)
            });
          }
        });

        // Validate and auto-correct match result consistency
        match.validateMatchResult();
      }
    }

    // Save the match
    await match.save();

    // Now create/update statistics records
    await createStatisticsFromMatch(match);

    // Populate the response
    await match.populate([
      { path: 'playerPerformances.playerId', select: 'name jerseyNumber position' }
    ]);

    res.status(200).json({
      success: true,
      data: match,
      message: `${match.type === 'match' ? 'Match' : 'Training session'} completed successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to create statistics from completed match
async function createStatisticsFromMatch(match) {
  try {
    // Create or update statistics for each player performance
    for (const performance of match.playerPerformances) {
      // Check if statistics record already exists
      let stats = await Statistics.findOne({
        playerId: performance.playerId,
        matchId: match._id
      });

      if (stats) {
        // Update existing statistics
        stats.minutesPlayed = performance.minutesPlayed;
        stats.goals = performance.goals;
        stats.assists = performance.assists;
        stats.yellowCards = performance.yellowCards;
        stats.redCards = performance.redCards;
        stats.rating = performance.rating;
        stats.playerOfMatch = performance.playerOfMatch;
        stats.positionsPlayed = [performance.playerId.position]; // Will be populated from player data
      } else {
        // Create new statistics record
        stats = new Statistics({
          playerId: performance.playerId,
          matchId: match._id,
          minutesPlayed: performance.minutesPlayed,
          goals: performance.goals,
          assists: performance.assists,
          yellowCards: performance.yellowCards,
          redCards: performance.redCards,
          rating: performance.rating,
          playerOfMatch: performance.playerOfMatch,
          positionsPlayed: [], // Will be populated below
          substitutionsCount: 0, // This could be enhanced to track actual substitutions
          injuries: []
        });
      }

      // Get player position for positionsPlayed field
      try {
        const player = await Player.findById(performance.playerId);
        if (player) {
          stats.positionsPlayed = [player.position];
        }
      } catch (playerError) {
        console.warn(`Could not find player ${performance.playerId} for positions`);
        stats.positionsPlayed = ['Unknown'];
      }

      await stats.save();
    }

    // For players who didn't have explicit performances but were in the team sheet
    for (const playerId of match.teamSheet) {
      const existingPerformance = match.playerPerformances.find(
        p => p.playerId.toString() === playerId.toString()
      );

      if (!existingPerformance) {
        // Check if statistics record already exists
        let stats = await Statistics.findOne({
          playerId: playerId,
          matchId: match._id
        });

        const minutesPlayed = match.getPlayerPlaytime(playerId);

        if (stats) {
          // Update existing statistics with just playtime
          stats.minutesPlayed = minutesPlayed;
        } else {
          // Create basic statistics record
          const player = await Player.findById(playerId);
          stats = new Statistics({
            playerId: playerId,
            matchId: match._id,
            minutesPlayed: minutesPlayed,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            playerOfMatch: false,
            positionsPlayed: player ? [player.position] : ['Unknown'],
            substitutionsCount: 0,
            injuries: []
          });
        }

        await stats.save();
      }
    }

    console.log(`✅ Statistics created/updated for match ${match._id}`);
  } catch (error) {
    console.error(`❌ Error creating statistics for match ${match._id}:`, error.message);
    throw error;
  }
}

// Helper function to check playtime fairness
function checkPlaytimeFairness(match) {
  const playtimes = Array.from(match.playtime.values());
  
  if (playtimes.length < 2) return null;

  const maxPlaytime = Math.max(...playtimes);
  const minPlaytime = Math.min(...playtimes);
  const difference = maxPlaytime - minPlaytime;

  if (difference > 20) {
    return {
      type: 'unfair_playtime',
      message: `Playtime difference is ${difference} minutes. Consider rotating players.`,
      maxPlaytime,
      minPlaytime,
      difference
    };
  }

  return null;
}

module.exports = {
  getMatches,
  getMatch,
  startMatch,
  startExistingMatch,
  makeSubstitution,
  getPlaytimeStats,
  endMatch
};

