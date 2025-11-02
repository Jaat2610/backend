const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Player name is required'],
    trim: true,
    maxlength: [100, 'Player name cannot exceed 100 characters']
  },
  jerseyNumber: {
    type: Number,
    required: [true, 'Jersey number is required'],
    unique: true,
    min: [1, 'Jersey number must be at least 1'],
    max: [99, 'Jersey number cannot exceed 99']
  },
  position: {
    type: String,
    required: [true, 'Player position is required'],
    enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
    trim: true
  },
  injuryStatus: {
    type: String,
    enum: ['Healthy', 'Minor Injury', 'Major Injury', 'Recovering'],
    default: 'Healthy'
  },
  preferredPositions: [{
    type: String,
    enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward']
  }],
  availability: {
    type: Boolean,
    default: true
  },
  dateOfBirth: {
    type: Date,
    required: false,
    validate: {
      validator: function (value) {
        if (!value) return true; // Optional field, so null/undefined is valid

        // Calculate age
        const today = new Date();
        const birthDate = new Date(value);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();

        // Adjust age if birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
          age--;
        }

        // Must not be older than 20 years (junior soccer)
        return age <= 20 && birthDate <= today;
      },
      message: 'Player must be 20 years old or younger (junior soccer) and date of birth cannot be in the future'
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
playerSchema.index({ jerseyNumber: 1 });
playerSchema.index({ position: 1 });
playerSchema.index({ availability: 1 });

// Validate preferred positions
playerSchema.pre('save', function (next) {
  if (this.preferredPositions.length === 0) {
    this.preferredPositions.push(this.position);
  }
  next();
});

module.exports = mongoose.model('Player', playerSchema);

