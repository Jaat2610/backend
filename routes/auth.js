const express = require('express');
const { authController } = require('../controllers');
const { protect, validateUserRegistration, validateUserLogin } = require('../middleware');

const router = express.Router();

// Authentication routes
router.post('/register', validateUserRegistration, authController.register);
router.post('/login', validateUserLogin, authController.login);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', protect, authController.getMe);
router.put('/updatedetails', protect, authController.updateDetails);
router.put('/updatepassword', protect, authController.updatePassword);

module.exports = router;

