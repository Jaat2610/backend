# Junior Soccer Tool - Simple Auth Backend

A beginner-friendly Node.js backend API focused on user authentication. Perfect for learning backend development basics!

## 🚀 Features

- **User Registration**: Simple user signup with basic validation
- **User Login**: Secure authentication with JWT tokens
- **User Profile**: Get current user information
- **Password Management**: Update user passwords
- **Basic Security**: Simple input sanitization and security headers
- **MongoDB Integration**: Easy database setup with Mongoose
- **Error Handling**: Clean error responses for API consumers

## 🛠 Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **Security**: Basic CORS, input sanitization
- **Validation**: Express Validator (simplified for beginners)

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js         # MongoDB connection
│   └── env.js             # Environment configuration
├── controllers/
│   ├── authController.js   # Authentication logic
│   └── index.js           # Controller exports
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   ├── errorHandler.js    # Global error handling
│   ├── security.js        # Basic security middleware
│   ├── validation.js      # Simple input validation
│   └── index.js          # Middleware exports
├── models/
│   ├── User.js            # User schema for authentication
│   └── index.js          # Model exports
├── routes/
│   ├── auth.js            # Authentication routes
│   └── index.js          # Route exports
├── scripts/
│   └── verify-setup.js    # Setup verification script
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to backend directory:**

   ```bash
   cd backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the backend root:

   ```env
   # Server Configuration
   PORT=5001
   NODE_ENV=development

   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/junior-soccer-tool

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # CORS Configuration
   FRONTEND_URL=http://localhost:3000

   # Rate Limiting
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

4. **Start MongoDB:**
   Make sure MongoDB is running on your system.

5. **Start the development server:**

   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:5001`

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile (requires authentication)
- `PUT /api/auth/updatedetails` - Update user details (requires authentication)
- `PUT /api/auth/updatepassword` - Update password (requires authentication)

### Request Examples

#### Register User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login User

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "password123"
}
```

#### Get User Profile

```bash
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Basic data validation for forms
- **CORS**: Cross-origin resource sharing for frontend
- **Input Sanitization**: Basic XSS protection
- **Password Hashing**: bcrypt with salt
- **Security Headers**: Basic security headers

## 📊 Database Schema

### User Model

```javascript
{
  username: String,        // Unique username (3-30 characters)
  email: String,          // Valid email address
  password: String,       // Hashed password (bcrypt)
  firstName: String,      // User's first name
  lastName: String,       // User's last name
  role: String,           // User role ('coach', 'assistant_coach', 'admin')
  isActive: Boolean,      // Account status
  lastLogin: Date,        // Last login timestamp
  loginAttempts: Number,  // Failed login attempts counter
  lockUntil: Date         // Account lock timestamp
}
```

## 🧪 Testing

### Health Check

Run the health check endpoint to verify the API is working:

```bash
curl http://localhost:5001/health
```

### API Testing

Test the authentication endpoints:

```bash
# Register a new user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'
```

### Setup Verification

Run the setup verification script to check if everything is configured correctly:

```bash
node scripts/verify-setup.js
```

## 🚀 Production Deployment

1. **Set production environment variables**
2. **Use a production MongoDB instance (MongoDB Atlas, etc.)**
3. **Set strong JWT secret (at least 32 characters)**
4. **Configure proper CORS origins for your frontend**
5. **Use HTTPS in production**
6. **Set NODE_ENV=production**

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run verify` - Run setup verification script

## 🤝 Contributing

This is a beginner-friendly project! Here are some tips:

1. Keep the code simple and well-commented
2. Add proper error handling
3. Include basic input validation
4. Write clear commit messages
5. Test your changes with the API endpoints

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the API documentation at `GET /api`
2. Review the health check at `GET /health`
3. Check server logs for error details
4. Verify environment variables are set correctly
5. Run `node scripts/verify-setup.js` to check your setup

## 🎯 Learning Goals

This project helps beginners learn:

- **Express.js** routing and middleware
- **JWT authentication** and authorization
- **MongoDB** with Mongoose ODM
- **Input validation** and sanitization
- **Error handling** in Node.js
- **Security basics** for web applications
- **RESTful API** design principles

Perfect for your first backend project! 🚀

---

Built with ❤️ for learning backend development
