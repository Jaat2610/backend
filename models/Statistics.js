const mongoose = require('mongoose');

const statisticsSchema = new mongoose.Schema({
  playerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: [true, 'Player ID is required']
  },
  minutesPlayed: {
    type: Number,
    default: 0,
    min: [0, 'Minutes played cannot be negative']
  },
  positionsPlayed: [{
    type: String,
    enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']
  }],
  substitutionsCount: {
    type: Number,
    default: 0,
    min: [0, 'Substitutions count cannot be negative']
  },
  injuries: [{
    type: String,
    trim: true,
    maxlength: [200, 'Injury description cannot exceed 200 characters']
  }],
  playerOfMatch: {
    type: Boolean,
    default: false
  },
  matchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    required: [true, 'Match ID is required']
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
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
statisticsSchema.index({ playerId: 1, matchId: 1 }, { unique: true });
statisticsSchema.index({ playerId: 1 });
statisticsSchema.index({ matchId: 1 });
statisticsSchema.index({ playerOfMatch: 1 });

// Static method to get player season stats
statisticsSchema.statics.getPlayerSeasonStats = async function(playerId, season) {
  const stats = await this.aggregate([
    { $match: { playerId: new mongoose.Types.ObjectId(playerId) } },
    {
      $group: {
        _id: '$playerId',
        totalMinutes: { $sum: '$minutesPlayed' },
        totalSubstitutions: { $sum: '$substitutionsCount' },
        totalGoals: { $sum: '$goals' },
        totalAssists: { $sum: '$assists' },
        totalYellowCards: { $sum: '$yellowCards' },
        totalRedCards: { $sum: '$redCards' },
        playerOfMatchCount: { $sum: { $cond: ['$playerOfMatch', 1, 0] } },
        averageRating: { $avg: '$rating' },
        matchesPlayed: { $sum: 1 },
        allPositionsPlayed: { $addToSet: '$positionsPlayed' },
        totalInjuries: { $sum: { $size: '$injuries' } }
      }
    }
  ]);
  
  return stats.length > 0 ? stats[0] : null;
};

// Instance method to calculate performance metrics
statisticsSchema.methods.getPerformanceMetrics = function() {
  return {
    minutesPerMatch: this.minutesPlayed,
    goalsPerMatch: this.goals,
    assistsPerMatch: this.assists,
    disciplinaryPoints: (this.yellowCards * 1) + (this.redCards * 3),
    versatility: this.positionsPlayed.length,
    injuryProne: this.injuries.length > 0
  };
};

module.exports = mongoose.model('Statistics', statisticsSchema);

