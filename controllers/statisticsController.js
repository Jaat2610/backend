const { Statistics, Player, Match } = require('../models');
const moment = require('moment');

// @desc    Get individual player statistics
// @route   GET /api/stats/player/:id
// @access  Private
const getPlayerStats = async (req, res, next) => {
  try {
    const { id: playerId } = req.params;
    const { season, startDate, endDate } = req.query;

    // Verify player exists
    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Build date filter
    let dateFilter = {};
    if (season) {
      // Season format: "2023-2024"
      const [startYear, endYear] = season.split('-');
      dateFilter = {
        createdAt: {
          $gte: new Date(`${startYear}-09-01`), // Season starts in September
          $lte: new Date(`${endYear}-08-31`)    // Season ends in August
        }
      };
    } else if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    } else {
      // Default to current season
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const seasonStartYear = currentMonth >= 9 ? currentYear : currentYear - 1;
      dateFilter = {
        createdAt: {
          $gte: new Date(`${seasonStartYear}-09-01`),
          $lte: new Date(`${seasonStartYear + 1}-08-31`)
        }
      };
    }

    // Get all statistics for the player in the specified period
    const playerStats = await Statistics.find({
      playerId,
      ...dateFilter
    }).populate('matchId', 'date type opponent venue status');

    // Calculate aggregate statistics
    const aggregateStats = {
      totalMatches: playerStats.length,
      totalMinutes: playerStats.reduce((sum, stat) => sum + stat.minutesPlayed, 0),
      totalGoals: playerStats.reduce((sum, stat) => sum + stat.goals, 0),
      totalAssists: playerStats.reduce((sum, stat) => sum + stat.assists, 0),
      totalSubstitutions: playerStats.reduce((sum, stat) => sum + stat.substitutionsCount, 0),
      totalYellowCards: playerStats.reduce((sum, stat) => sum + stat.yellowCards, 0),
      totalRedCards: playerStats.reduce((sum, stat) => sum + stat.redCards, 0),
      playerOfMatchCount: playerStats.filter(stat => stat.playerOfMatch).length,
      totalInjuries: playerStats.reduce((sum, stat) => sum + stat.injuries.length, 0),
      averageRating: playerStats.length > 0 ? 
        playerStats.reduce((sum, stat) => sum + (stat.rating || 0), 0) / playerStats.filter(stat => stat.rating).length : 0,
      positionsPlayed: [...new Set(playerStats.flatMap(stat => stat.positionsPlayed))],
      averageMinutesPerMatch: playerStats.length > 0 ? 
        playerStats.reduce((sum, stat) => sum + stat.minutesPlayed, 0) / playerStats.length : 0
    };

    // Performance metrics
    const performanceMetrics = {
      goalsPerMatch: aggregateStats.totalMatches > 0 ? aggregateStats.totalGoals / aggregateStats.totalMatches : 0,
      assistsPerMatch: aggregateStats.totalMatches > 0 ? aggregateStats.totalAssists / aggregateStats.totalMatches : 0,
      minutesPerGoal: aggregateStats.totalGoals > 0 ? aggregateStats.totalMinutes / aggregateStats.totalGoals : 0,
      disciplinaryPoints: (aggregateStats.totalYellowCards * 1) + (aggregateStats.totalRedCards * 3),
      versatility: aggregateStats.positionsPlayed.length,
      consistency: aggregateStats.totalMatches > 0 ? (aggregateStats.averageMinutesPerMatch / 90) * 100 : 0, // % of full match
      form: calculateRecentForm(playerStats.slice(-5)) // Last 5 matches
    };

    // Match breakdown by type
    const matchBreakdown = {
      matches: playerStats.filter(stat => stat.matchId.type === 'match').length,
      training: playerStats.filter(stat => stat.matchId.type === 'training').length
    };

    res.status(200).json({
      success: true,
      data: {
        player: {
          _id: player._id,
          name: player.name,
          jerseyNumber: player.jerseyNumber,
          position: player.position,
          preferredPositions: player.preferredPositions
        },
        aggregateStats,
        performanceMetrics,
        matchBreakdown,
        recentMatches: playerStats.slice(-10).reverse(), // Last 10 matches, most recent first
        period: season || `${startDate || 'season start'} to ${endDate || 'now'}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get match statistics and reports
// @route   GET /api/stats/match/:id
// @access  Private
const getMatchStats = async (req, res, next) => {
  try {
    const { id: matchId } = req.params;

    // Get match details
    const match = await Match.findById(matchId)
      .populate('teamSheet', 'name jerseyNumber position')
      .populate('substitutions.playerIn', 'name jerseyNumber')
      .populate('substitutions.playerOut', 'name jerseyNumber');

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Get all statistics for this match
    const matchStats = await Statistics.find({ matchId })
      .populate('playerId', 'name jerseyNumber position');

    // Calculate match summary
    const matchSummary = {
      totalGoals: matchStats.reduce((sum, stat) => sum + stat.goals, 0),
      totalAssists: matchStats.reduce((sum, stat) => sum + stat.assists, 0),
      totalYellowCards: matchStats.reduce((sum, stat) => sum + stat.yellowCards, 0),
      totalRedCards: matchStats.reduce((sum, stat) => sum + stat.redCards, 0),
      totalSubstitutions: match.substitutions.length,
      playersUsed: matchStats.length,
      averageRating: matchStats.length > 0 ? 
        matchStats.reduce((sum, stat) => sum + (stat.rating || 0), 0) / matchStats.filter(stat => stat.rating).length : 0,
      playerOfMatch: matchStats.find(stat => stat.playerOfMatch)?.playerId || null,
      injuriesReported: matchStats.reduce((sum, stat) => sum + stat.injuries.length, 0)
    };

    // Playtime analysis
    const playtimeAnalysis = {
      totalMinutesPlayed: Array.from(match.playtime.values()).reduce((sum, minutes) => sum + minutes, 0),
      averagePlaytime: match.playtime.size > 0 ? 
        Array.from(match.playtime.values()).reduce((sum, minutes) => sum + minutes, 0) / match.playtime.size : 0,
      maxPlaytime: Math.max(...Array.from(match.playtime.values())),
      minPlaytime: Math.min(...Array.from(match.playtime.values())),
      playtimeFairness: calculatePlaytimeFairness(match.playtime)
    };

    // Top performers
    const topPerformers = {
      topScorer: matchStats.reduce((top, stat) => stat.goals > (top?.goals || 0) ? stat : top, null),
      topAssister: matchStats.reduce((top, stat) => stat.assists > (top?.assists || 0) ? stat : top, null),
      highestRated: matchStats.reduce((top, stat) => (stat.rating || 0) > (top?.rating || 0) ? stat : top, null),
      mostMinutes: Array.from(match.playtime.entries()).reduce((top, [playerId, minutes]) => {
        return minutes > (top?.minutes || 0) ? { playerId, minutes } : top;
      }, null)
    };

    // Position analysis
    const positionStats = {};
    matchStats.forEach(stat => {
      stat.positionsPlayed.forEach(position => {
        if (!positionStats[position]) {
          positionStats[position] = {
            playersUsed: 0,
            totalMinutes: 0,
            totalGoals: 0,
            totalAssists: 0,
            averageRating: 0
          };
        }
        positionStats[position].playersUsed++;
        positionStats[position].totalMinutes += stat.minutesPlayed;
        positionStats[position].totalGoals += stat.goals;
        positionStats[position].totalAssists += stat.assists;
        positionStats[position].averageRating += stat.rating || 0;
      });
    });

    // Calculate averages for position stats
    Object.keys(positionStats).forEach(position => {
      const stats = positionStats[position];
      stats.averageRating = stats.playersUsed > 0 ? stats.averageRating / stats.playersUsed : 0;
    });

    res.status(200).json({
      success: true,
      data: {
        match: {
          _id: match._id,
          date: match.date,
          type: match.type,
          opponent: match.opponent,
          venue: match.venue,
          status: match.status,
          duration: match.duration
        },
        matchSummary,
        playtimeAnalysis,
        topPerformers,
        positionStats,
        playerStats: matchStats,
        substitutions: match.substitutions,
        teamSheet: match.teamSheet
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log an injury for a player
// @route   POST /api/stats/log-injury
// @access  Private
const logInjury = async (req, res, next) => {
  try {
    const { playerId, matchId, injuryDescription, severity } = req.body;

    // Verify player and match exist
    const [player, match] = await Promise.all([
      Player.findById(playerId),
      Match.findById(matchId)
    ]);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Find or create statistics record for this player and match
    let stats = await Statistics.findOne({ playerId, matchId });
    
    if (!stats) {
      stats = new Statistics({
        playerId,
        matchId,
        minutesPlayed: match.getPlayerPlaytime(playerId) || 0,
        positionsPlayed: [player.position]
      });
    }

    // Add injury to the statistics
    stats.injuries.push(injuryDescription);
    await stats.save();

    // Update player's injury status based on severity
    if (severity) {
      const injuryStatusMap = {
        'minor': 'Minor Injury',
        'major': 'Major Injury',
        'severe': 'Major Injury'
      };

      const newInjuryStatus = injuryStatusMap[severity.toLowerCase()] || 'Minor Injury';
      
      await Player.findByIdAndUpdate(playerId, {
        injuryStatus: newInjuryStatus,
        ...(newInjuryStatus === 'Major Injury' && { availability: false })
      });
    }

    // Populate the updated stats
    await stats.populate([
      { path: 'playerId', select: 'name jerseyNumber position' },
      { path: 'matchId', select: 'date type opponent' }
    ]);

    res.status(201).json({
      success: true,
      data: stats,
      message: 'Injury logged successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get team statistics overview
// @route   GET /api/stats/team
// @access  Private
const getTeamStats = async (req, res, next) => {
  try {
    const { season, startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (season) {
      const [startYear, endYear] = season.split('-');
      dateFilter = {
        createdAt: {
          $gte: new Date(`${startYear}-09-01`),
          $lte: new Date(`${endYear}-08-31`)
        }
      };
    } else if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get all matches in the period
    const matches = await Match.find(dateFilter).populate('teamSheet', 'name position');
    
    // Get all statistics in the period
    const allStats = await Statistics.find(dateFilter)
      .populate('playerId', 'name jerseyNumber position')
      .populate('matchId', 'date type opponent');

    // Handle case where no statistics exist yet
    if (!allStats || allStats.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          teamOverview: {
            totalMatches: matches.length,
            matchesWon: 0,
            matchesDrawn: 0,
            matchesLost: 0,
            totalGoals: 0,
            totalAssists: 0,
            totalMinutesPlayed: 0,
            totalPlayers: 0,
            averagePlayersPerMatch: 0
          },
          playerParticipation: [],
          topPerformers: {
            topScorer: null,
            topAssister: null,
            mostConsistent: null,
            highestRated: null
          },
          period: season || `${startDate || 'start'} to ${endDate || 'now'}`
        }
      });
    }

    // Calculate match results from completed matches
    const completedMatches = matches.filter(match => 
      match.status === 'completed' && match.type === 'match'
    );
    
    const matchResults = {
      wins: completedMatches.filter(match => match.matchResult?.result === 'win').length,
      draws: completedMatches.filter(match => match.matchResult?.result === 'draw').length,
      losses: completedMatches.filter(match => match.matchResult?.result === 'loss').length,
      goalsFor: completedMatches.reduce((sum, match) => sum + (match.matchResult?.ourScore || 0), 0),
      goalsAgainst: completedMatches.reduce((sum, match) => sum + (match.matchResult?.opponentScore || 0), 0)
    };

    // Calculate team overview
    const teamOverview = {
      totalMatches: matches.length,
      matchesWon: matchResults.wins,
      matchesDrawn: matchResults.draws,
      matchesLost: matchResults.losses,
      totalGoals: allStats.reduce((sum, stat) => sum + (stat.goals || 0), 0),
      totalAssists: allStats.reduce((sum, stat) => sum + (stat.assists || 0), 0),
      totalMinutesPlayed: allStats.reduce((sum, stat) => sum + (stat.minutesPlayed || 0), 0),
      totalPlayers: new Set(allStats
        .filter(stat => stat.playerId && stat.playerId._id)
        .map(stat => stat.playerId._id.toString())
      ).size,
      averagePlayersPerMatch: matches.length > 0 ? 
        allStats.length / matches.length : 0,
      // Additional match statistics
      competitiveMatches: completedMatches.length,
      trainingMatches: matches.filter(match => match.type === 'training').length,
      winPercentage: completedMatches.length > 0 ? 
        Math.round((matchResults.wins / completedMatches.length) * 100) : 0,
      goalDifference: matchResults.goalsFor - matchResults.goalsAgainst,
      averageGoalsFor: completedMatches.length > 0 ? 
        (matchResults.goalsFor / completedMatches.length).toFixed(1) : 0,
      averageGoalsAgainst: completedMatches.length > 0 ? 
        (matchResults.goalsAgainst / completedMatches.length).toFixed(1) : 0
    };

    // Player participation analysis
    const playerParticipation = {};
    allStats.forEach(stat => {
      // Safely handle the case where playerId might not be populated
      if (!stat.playerId || !stat.playerId._id) {
        console.warn('Statistics record found without valid playerId:', stat._id);
        return;
      }
      
      const playerId = stat.playerId._id.toString();
      if (!playerParticipation[playerId]) {
        playerParticipation[playerId] = {
          player: stat.playerId,
          matchesPlayed: 0,
          totalMinutes: 0,
          goals: 0,
          assists: 0,
          averageRating: 0,
          ratingsCount: 0
        };
      }
      
      const participation = playerParticipation[playerId];
      participation.matchesPlayed++;
      participation.totalMinutes += stat.minutesPlayed || 0;
      participation.goals += stat.goals || 0;
      participation.assists += stat.assists || 0;
      
      if (stat.rating) {
        participation.averageRating += stat.rating;
        participation.ratingsCount++;
      }
    });

    // Calculate average ratings
    Object.values(playerParticipation).forEach(participation => {
      if (participation.ratingsCount > 0) {
        participation.averageRating = participation.averageRating / participation.ratingsCount;
      }
    });

    // Top performers
    const participationArray = Object.values(playerParticipation);
    const topPerformers = {
      topScorer: participationArray.length > 0 ? participationArray.reduce((top, p) => p.goals > (top?.goals || 0) ? p : top, null) : null,
      topAssister: participationArray.length > 0 ? participationArray.reduce((top, p) => p.assists > (top?.assists || 0) ? p : top, null) : null,
      mostConsistent: participationArray.length > 0 ? participationArray.reduce((top, p) => p.matchesPlayed > (top?.matchesPlayed || 0) ? p : top, null) : null,
      highestRated: participationArray.length > 0 ? participationArray.reduce((top, p) => p.averageRating > (top?.averageRating || 0) ? p : top, null) : null
    };

    res.status(200).json({
      success: true,
      data: {
        teamOverview,
        playerParticipation: participationArray.sort((a, b) => b.matchesPlayed - a.matchesPlayed),
        topPerformers,
        period: season || `${startDate || 'start'} to ${endDate || 'now'}`
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate recent form
function calculateRecentForm(recentStats) {
  if (recentStats.length === 0) return 0;
  
  let formScore = 0;
  recentStats.forEach(stat => {
    // Base score from rating
    formScore += (stat.rating || 5) * 10;
    
    // Bonus for goals and assists
    formScore += stat.goals * 15;
    formScore += stat.assists * 10;
    
    // Penalty for cards
    formScore -= stat.yellowCards * 5;
    formScore -= stat.redCards * 20;
    
    // Bonus for player of match
    if (stat.playerOfMatch) formScore += 25;
  });
  
  return Math.round(formScore / recentStats.length);
}

// Helper function to calculate playtime fairness
function calculatePlaytimeFairness(playtimeMap) {
  const playtimes = Array.from(playtimeMap.values());
  if (playtimes.length <= 1) return 100;
  
  const maxPlaytime = Math.max(...playtimes);
  const minPlaytime = Math.min(...playtimes);
  const difference = maxPlaytime - minPlaytime;
  
  // Fairness decreases as difference increases
  // 100% fair if difference is 0, 0% fair if difference is >= 45 minutes
  return Math.max(0, Math.round(100 - (difference / 45) * 100));
}

module.exports = {
  getPlayerStats,
  getMatchStats,
  logInjury,
  getTeamStats
};

