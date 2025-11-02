const auth = require('./auth');
const errorHandler = require('./errorHandler');
const validation = require('./validation');
const security = require('./security');

module.exports = {
  ...auth,
  errorHandler,
  ...validation,
  ...security
};
