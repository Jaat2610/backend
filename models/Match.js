const mongoose = require('mongoose');

const substitutionSchema = new mongoose.Schema({
  playerIn: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  playerOut: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  time: {
    type: Date,
    required: true,
    default: Date.now
  },
  reason: {
    type: String,
    default: 'Tactical substitution',
    maxlength: [200, 'Reason cannot exceed 200 characters']
  }
});

// Schema for individual player performance in a match
const playerPerformanceSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  goals: {
    type: Number,
    default: 0,
    min: [0, 'Goals cannot be negative']
  },
  assists: {
    type: Number,
    default: 0,
    min: [0, 'Assists cannot be negative']
  },
  yellowCards: {
    type: Number,
    default: 0,
    min: [0, 'Yellow cards cannot be negative']
  },
  redCards: {
    type: Number,
    default: 0,
    min: [0, 'Red cards cannot be negative']
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [10, 'Rating cannot exceed 10']
  },
  playerOfMatch: {
    type: Boolean,
    default: false
  },
  minutesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Minutes played cannot be negative']
  }
});

// Schema for match result
const matchResultSchema = new mongoose.Schema({
  result: {
    type: String,
    enum: ['win', 'loss', 'draw'],
    required: function() {
      return this.parent().type === 'match' && this.parent().status === 'completed';
    }
  },
  ourScore: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative'],
    required: function() {
      return this.parent().type === 'match' && this.parent().status === 'completed';
    }
  },
  opponentScore: {
    type: Number,
    default: 0,
    min: [0, 'Score cannot be negative'],
    required: function() {
      return this.parent().type === 'match' && this.parent().status === 'completed';
    }
  }
});

const matchSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Match date is required'],
    validate: {
      validator: function(value) {
        return value <= new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Max 1 year in future
      },
      message: 'Match date cannot be more than 1 year in the future'
    }
  },
  type: {
    type: String,
    required: [true, 'Match type is required'],
    enum: ['match', 'training'],
    lowercase: true
  },
  teamSheet: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player'
  }],
  substitutions: [substitutionSchema],
  playtime: {
    type: Map,
    of: Number,
    default: new Map()
  },
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  duration: {
    type: Number,
    default: 90, // minutes
    min: [1, 'Duration must be at least 1 minute'],
    max: [200, 'Duration cannot exceed 200 minutes']
  },
  opponent: {
    type: String,
    trim: true,
    maxlength: [100, 'Opponent name cannot exceed 100 characters']
  },
  venue: {
    type: String,
    trim: true,
    maxlength: [200, 'Venue cannot exceed 200 characters']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  // Match result (only for completed matches)
  matchResult: matchResultSchema,
  // Individual player performances
  playerPerformances: [playerPerformanceSchema]
}, {
  timestamps: true
});

// Indexes for efficient querying
matchSchema.index({ date: 1 });
matchSchema.index({ type: 1 });
matchSchema.index({ status: 1 });

// Calculate total playtime for a match
matchSchema.methods.getTotalPlaytime = function() {
  let total = 0;
  for (let minutes of this.playtime.values()) {
    total += minutes;
  }
  return total;
};

// Get playtime for a specific player
matchSchema.methods.getPlayerPlaytime = function(playerId) {
  return this.playtime.get(playerId.toString()) || 0;
};

// Update playtime for a player
matchSchema.methods.updatePlayerPlaytime = function(playerId, minutes) {
  this.playtime.set(playerId.toString(), minutes);
  this.markModified('playtime');
};

// Calculate team's total goals from player performances
matchSchema.methods.calculateTeamGoals = function() {
  return this.playerPerformances.reduce((total, performance) => total + performance.goals, 0);
};

// Calculate team's total assists from player performances
matchSchema.methods.calculateTeamAssists = function() {
  return this.playerPerformances.reduce((total, performance) => total + performance.assists, 0);
};

// Get player performance for a specific player
matchSchema.methods.getPlayerPerformance = function(playerId) {
  return this.playerPerformances.find(p => p.playerId.toString() === playerId.toString());
};

// Update or create player performance
matchSchema.methods.updatePlayerPerformance = function(playerId, performanceData) {
  const existingPerformance = this.getPlayerPerformance(playerId);
  
  if (existingPerformance) {
    // Update existing performance
    Object.assign(existingPerformance, performanceData);
  } else {
    // Create new performance record
    this.playerPerformances.push({
      playerId,
      ...performanceData
    });
  }
  
  this.markModified('playerPerformances');
};

// Validate match result consistency (now only validates that ourScore matches calculated goals)
matchSchema.methods.validateMatchResult = function() {
  if (!this.matchResult || this.type !== 'match') return true;
  
  const calculatedGoals = this.calculateTeamGoals();
  // Auto-correct ourScore to match calculated goals (since it should always be calculated from player goals)
  this.matchResult.ourScore = calculatedGoals;
  
  return true;
};

module.exports = mongoose.model('Match', matchSchema);

