const { Player } = require('../models');

// @desc    Get all players
// @route   GET /api/players
// @access  Private
const getPlayers = async (req, res, next) => {
  try {
    // Build query
    let query = {};

    // Filter by availability if specified
    if (req.query.availability !== undefined) {
      query.availability = req.query.availability === 'true';
    }

    // Filter by position if specified
    if (req.query.position) {
      query.position = req.query.position;
    }

    // Filter by injury status if specified
    if (req.query.injuryStatus) {
      query.injuryStatus = req.query.injuryStatus;
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;

    // Sort
    const sortBy = req.query.sortBy || 'jerseyNumber';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
    const sort = {};
    sort[sortBy] = sortOrder;

    // Execute query
    const players = await Player.find(query)
      .sort(sort)
      .limit(limit)
      .skip(startIndex);

    const total = await Player.countDocuments(query);

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
      count: players.length,
      total,
      pagination,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single player
// @route   GET /api/players/:id
// @access  Private
const getPlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new player
// @route   POST /api/players
// @access  Private
const createPlayer = async (req, res, next) => {
  try {
    // Check if jersey number is already taken
    const existingPlayer = await Player.findOne({ jerseyNumber: req.body.jerseyNumber });
    
    if (existingPlayer) {
      return res.status(400).json({
        success: false,
        message: `Jersey number ${req.body.jerseyNumber} is already taken`
      });
    }

    const player = await Player.create(req.body);

    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Private
const updatePlayer = async (req, res, next) => {
  try {
    let player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Check if jersey number is being changed and if it's already taken
    if (req.body.jerseyNumber && req.body.jerseyNumber !== player.jerseyNumber) {
      const existingPlayer = await Player.findOne({ jerseyNumber: req.body.jerseyNumber });
      
      if (existingPlayer) {
        return res.status(400).json({
          success: false,
          message: `Jersey number ${req.body.jerseyNumber} is already taken`
        });
      }
    }

    player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private
const deletePlayer = async (req, res, next) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    // Note: In a simple system, we allow deletion of any player
    // In a more complex system, you might want to check for related data

    await Player.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Player deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available players for selection
// @route   GET /api/players/available
// @access  Private
const getAvailablePlayers = async (req, res, next) => {
  try {
    const players = await Player.find({ 
      availability: true,
      injuryStatus: { $in: ['Healthy', 'Minor Injury'] }
    }).sort({ jerseyNumber: 1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get players by position
// @route   GET /api/players/position/:position
// @access  Private
const getPlayersByPosition = async (req, res, next) => {
  try {
    const { position } = req.params;
    
    // Validate position
    const validPositions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid position'
      });
    }

    const players = await Player.find({
      $or: [
        { position: position },
        { preferredPositions: position }
      ],
      availability: true
    }).sort({ jerseyNumber: 1 });

    res.status(200).json({
      success: true,
      count: players.length,
      data: players
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update player injury status
// @route   PUT /api/players/:id/injury
// @access  Private
const updateInjuryStatus = async (req, res, next) => {
  try {
    const { injuryStatus } = req.body;
    
    const player = await Player.findByIdAndUpdate(
      req.params.id,
      { 
        injuryStatus,
        ...(injuryStatus === 'Major Injury' && { availability: false })
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }

    res.status(200).json({
      success: true,
      data: player
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlayers,
  getPlayer,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getAvailablePlayers,
  getPlayersByPosition,
  updateInjuryStatus
};

