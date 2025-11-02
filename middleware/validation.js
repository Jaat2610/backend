const { body, param, validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errorMessages
    });
  }

  next();
};

// Simple user registration validation (beginner-friendly)
const validateUserRegistration = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters'),

  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required'),

  handleValidationErrors
];

// Simple user login validation (beginner-friendly)
const validateUserLogin = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors
];

// Match validation rules
const validateMatch = (req, res, next) => {
  // Basic validation for match creation
  const { date, type, teamSheet } = req.body;

  if (!date || !type) {
    return res.status(400).json({
      success: false,
      message: 'Date and type are required'
    });
  }

  if (!['match', 'training'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: 'Type must be either "match" or "training"'
    });
  }

  if (teamSheet && !Array.isArray(teamSheet)) {
    return res.status(400).json({
      success: false,
      message: 'Team sheet must be an array'
    });
  }

  next();
};

// Substitution validation
const validateSubstitution = (req, res, next) => {
  const { playerIn, playerOut, reason, injuryStatus } = req.body;

  if (!playerIn || !playerOut) {
    return res.status(400).json({
      success: false,
      message: 'Player in and player out are required'
    });
  }

  // If reason is injury-related, validate injury status
  if (reason && reason.toLowerCase().includes('injury') && injuryStatus) {
    const validInjuryStatuses = ['Minor Injury', 'Major Injury'];
    if (!validInjuryStatuses.includes(injuryStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid injury status. Must be "Minor Injury" or "Major Injury"'
      });
    }
  }

  next();
};

// MongoDB ObjectId validation
const validateObjectId = (paramName = 'id') => (req, res, next) => {
  const id = req.params[paramName];

  if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({
      success: false,
      message: `${paramName} must be a valid MongoDB ObjectId`
    });
  }

  next();
};

// Statistics validation
const validateStatistics = (req, res, next) => {
  const { playerId, matchId, injuryDescription, severity } = req.body;

  if (!playerId || !matchId || !injuryDescription) {
    return res.status(400).json({
      success: false,
      message: 'Player ID, match ID, and injury description are required'
    });
  }

  if (severity && !['minor', 'major', 'severe'].includes(severity.toLowerCase())) {
    return res.status(400).json({
      success: false,
      message: 'Severity must be "minor", "major", or "severe"'
    });
  }

  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateMatch,
  validateSubstitution,
  validateStatistics,
  validateObjectId,
  handleValidationErrors
};
