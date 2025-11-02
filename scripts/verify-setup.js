#!/usr/bin/env node

/**
 * Junior Soccer Tool Backend Setup Verification Script
 * 
 * This script verifies that all components are properly set up and can be loaded
 * without running the full server.
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Junior Soccer Tool Backend - Setup Verification\n');

let errors = 0;
let warnings = 0;

// Test 1: Check package.json
console.log('1. Checking package.json...');
try {
  const packageJson = require('../package.json');
  console.log(`   ✅ Package: ${packageJson.name} v${packageJson.version}`);
} catch (error) {
  console.log(`   ❌ Error loading package.json: ${error.message}`);
  errors++;
}

// Test 2: Check environment configuration
console.log('\n2. Checking environment configuration...');
try {
  const config = require('../config/env');
  console.log(`   ✅ Environment: ${config.NODE_ENV}`);
  console.log(`   ✅ Port: ${config.PORT}`);
  console.log(`   ✅ MongoDB URI: ${config.MONGODB_URI ? 'Set' : 'Not set'}`);
  console.log(`   ✅ JWT Secret: ${config.JWT_SECRET ? 'Set' : 'Not set'}`);
  
  if (config.JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production') {
    console.log(`   ⚠️  Warning: Using default JWT secret - change this in production!`);
    warnings++;
  }
} catch (error) {
  console.log(`   ❌ Error loading environment config: ${error.message}`);
  errors++;
}

// Test 3: Check models
console.log('\n3. Checking database models...');
try {
  const models = require('../models');
  const modelNames = Object.keys(models);
  console.log(`   ✅ Models loaded: ${modelNames.join(', ')}`);
} catch (error) {
  console.log(`   ❌ Error loading models: ${error.message}`);
  errors++;
}

// Test 4: Check middleware
console.log('\n4. Checking middleware...');
try {
  const middleware = require('../middleware');
  console.log(`   ✅ Middleware loaded successfully`);
  console.log(`   ✅ Auth middleware: ${typeof middleware.protect === 'function' ? 'OK' : 'Missing'}`);
  console.log(`   ✅ Validation middleware: ${Array.isArray(middleware.validateUserRegistration) && Array.isArray(middleware.validateUserLogin) ? 'OK' : 'Missing'}`);
  console.log(`   ✅ Error handler: ${typeof middleware.errorHandler === 'function' ? 'OK' : 'Missing'}`);
} catch (error) {
  console.log(`   ❌ Error loading middleware: ${error.message}`);
  errors++;
}

// Test 5: Check controllers
console.log('\n5. Checking controllers...');
try {
  const controllers = require('../controllers');
  const controllerNames = Object.keys(controllers);
  console.log(`   ✅ Controllers loaded: ${controllerNames.join(', ')}`);
} catch (error) {
  console.log(`   ❌ Error loading controllers: ${error.message}`);
  errors++;
}

// Test 6: Check routes
console.log('\n6. Checking routes...');
try {
  const routes = require('../routes');
  const routeNames = Object.keys(routes);
  console.log(`   ✅ Routes loaded: ${routeNames.join(', ')}`);
} catch (error) {
  console.log(`   ❌ Error loading routes: ${error.message}`);
  errors++;
}

// Test 7: Skipped (no Socket.io in minimal auth-only setup)
console.log('\n7. Skipping Socket.io utilities (not used in this setup)');

// Test 8: Check server file
console.log('\n8. Checking main server file...');
try {
  // Don't actually require the server file as it would start the server
  const serverPath = path.join(__dirname, '../server.js');
  if (fs.existsSync(serverPath)) {
    console.log(`   ✅ Server file exists at: ${serverPath}`);
  } else {
    console.log(`   ❌ Server file not found`);
    errors++;
  }
} catch (error) {
  console.log(`   ❌ Error checking server file: ${error.message}`);
  errors++;
}

// Test 9: Check environment template
console.log('\n9. Checking environment template...');
try {
  const envTemplatePath = path.join(__dirname, '../env.template');
  if (fs.existsSync(envTemplatePath)) {
    console.log(`   ✅ Environment template exists`);
  } else {
    console.log(`   ⚠️  Environment template not found`);
    warnings++;
  }
} catch (error) {
  console.log(`   ⚠️  Error checking environment template: ${error.message}`);
  warnings++;
}

// Test 10: Check .gitignore
console.log('\n10. Checking .gitignore...');
try {
  const gitignorePath = path.join(__dirname, '../.gitignore');
  if (fs.existsSync(gitignorePath)) {
    console.log(`   ✅ .gitignore file exists`);
  } else {
    console.log(`   ⚠️  .gitignore file not found`);
    warnings++;
  }
} catch (error) {
  console.log(`   ⚠️  Error checking .gitignore: ${error.message}`);
  warnings++;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📋 VERIFICATION SUMMARY');
console.log('='.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('🎉 ALL CHECKS PASSED! Your setup is ready to go!');
} else if (errors === 0) {
  console.log(`✅ Setup is functional with ${warnings} warning(s).`);
} else {
  console.log(`❌ Setup has ${errors} error(s) and ${warnings} warning(s).`);
}

console.log('\n📚 Next Steps:');
console.log('1. Create a .env file from env.template');
console.log('2. Start MongoDB service');
console.log('3. Run: npm run dev');
console.log('4. Test the API at: http://localhost:5001/health');

console.log('\n🚀 Ready to monitor junior soccer! ⚽');

process.exit(errors > 0 ? 1 : 0);

