# 📘 StackIt Backend API - Complete Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000` (development) / `https://your-domain.com` (production)  
**Technology Stack:** Node.js, Express.js, Supabase, JWT Authentication

---

## 📋 Table of Contents

1. [Server Overview](#server-overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Core Endpoints](#core-endpoints)
6. [Auth API](#auth-api)
7. [Questions API](#questions-api)
8. [Answers API](#answers-api)
9. [Users API](#users-api)
10. [Tags API](#tags-api)
11. [Notifications API](#notifications-api)
12. [Upload API](#upload-api)
13. [Admin API](#admin-api)
14. [Testing Examples](#testing-examples)
15. [Environment Variables](#environment-variables)

---

## 🖥️ Server Overview

### Server Configuration
- **Port:** 5000 (default) or via `PORT` environment variable
- **Security:** Helmet for security headers, CORS enabled
- **Rate Limiting:** 100 requests per 15 minutes per IP
- **Body Parsing:** JSON and URL-encoded (10MB limit)
- **Logging:** Morgan (development mode)

### Core Middleware Stack
1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - API rate limiting
4. **Body Parsing** - JSON/URL-encoded parsing
5. **Authentication** - JWT token verification
6. **Error Handling** - Centralized error handling

---

## 🔐 Authentication

### JWT Token Structure
```javascript
{
  "userId": "user_id_from_database",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Authentication Headers
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Protected Routes
- All routes except `/`, `/health`, `POST /api/auth/register`, `POST /api/auth/login`
- Optional authentication: `GET /api/questions`, `GET /api/questions/:id`

---

## ⚡ Rate Limiting

### Configuration
- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Scope:** All `/api/*` routes
- **Response:** 429 Too Many Requests

### Example Rate Limit Response
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## 🚨 Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

### Common HTTP Status Codes
- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **429** - Too Many Requests
- **500** - Internal Server Error

---

## 🏠 Core Endpoints

### GET /
**Purpose:** Welcome message and API overview

**Response:**
```json
{
  "message": "Welcome to the StackIt Backend API! Access API endpoints under /api/",
  "healthCheck": "/health",
  "apiEndpoints": [
    "/api/auth",
    "/api/questions",
    "/api/answers",
    "/api/users",
    "/api/tags",
    "/api/notifications",
    "/api/upload",
    "/api/admin"
  ]
}
```

### GET /health
**Purpose:** Health check endpoint

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.5
}
```

---

## 👤 Auth API

### POST /api/auth/register
**Purpose:** Register a new user

**Request Body:**
```json
{
  "email": "john@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "username": "johndoe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "User with this email or username already exists"
}
```

### POST /api/auth/login
**Purpose:** Login user

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "username": "johndoe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### GET /api/auth/me
**Purpose:** Get current user information  
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "john@example.com",
      "username": "johndoe",
      "role": "user",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### POST /api/auth/logout
**Purpose:** Logout user (client-side token removal)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## ❓ Questions API

### GET /api/questions
**Purpose:** Get all questions with pagination and filtering  
**Authentication:** Optional (for user vote status)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `tag` (string): Filter by tag name
- `search` (string): Search in title and description
- `sort` (string): 'recent' | 'popular' | 'oldest' (default: 'recent')

**Example Request:**
```http
GET /api/questions?page=1&limit=5&tag=javascript&sort=popular
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "uuid-here",
        "title": "How to use async/await in JavaScript?",
        "description": "I'm confused about async/await syntax...",
        "user_id": "uuid-here",
        "created_at": "2024-01-01T00:00:00.000Z",
        "author": {
          "id": "uuid-here",
          "username": "johndoe"
        },
        "tags": [
          {
            "id": "uuid-here",
            "name": "javascript"
          },
          {
            "id": "uuid-here",
            "name": "async"
          }
        ],
        "answer_count": 3,
        "vote_count": 5,
        "user_vote": "upvote"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "has_more": true
    }
  }
}
```

### GET /api/questions/:id
**Purpose:** Get single question with answers  
**Authentication:** Optional

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "question": {
      "id": "uuid-here",
      "title": "How to use async/await in JavaScript?",
      "description": "I'm confused about async/await syntax...",
      "user_id": "uuid-here",
      "created_at": "2024-01-01T00:00:00.000Z",
      "author": {
        "id": "uuid-here",
        "username": "johndoe"
      },
      "tags": [
        {
          "id": "uuid-here",
          "name": "javascript"
        }
      ],
      "answers": [
        {
          "id": "uuid-here",
          "question_id": "uuid-here",
          "user_id": "uuid-here",
          "answer": "Async/await is a syntactic sugar for promises...",
          "is_accepted": true,
          "created_at": "2024-01-01T01:00:00.000Z",
          "author": {
            "id": "uuid-here",
            "username": "expertdev"
          },
          "vote_count": 8,
          "user_vote": null,
          "can_accept": false
        }
      ],
      "vote_count": 5,
      "user_vote": "upvote",
      "can_edit": false
    }
  }
}
```

### POST /api/questions
**Purpose:** Create a new question  
**Authentication:** Required

**Request Body:**
```json
{
  "title": "How to handle errors in Node.js?",
  "content": "I'm struggling with error handling in my Express app...",
  "tags": ["nodejs", "express", "error-handling"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question": {
      "id": "uuid-here",
      "title": "How to handle errors in Node.js?",
      "description": "I'm struggling with error handling in my Express app...",
      "user_id": "uuid-here",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /api/questions/:id
**Purpose:** Update a question  
**Authentication:** Required (owner only)

**Request Body:**
```json
{
  "title": "How to handle errors in Node.js applications?",
  "content": "I'm struggling with error handling in my Express app. Updated question...",
  "tags": ["nodejs", "express", "error-handling", "best-practices"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question updated successfully",
  "data": {
    "question": {
      "id": "uuid-here",
      "title": "How to handle errors in Node.js applications?",
      "description": "I'm struggling with error handling in my Express app. Updated question...",
      "user_id": "uuid-here",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### DELETE /api/questions/:id
**Purpose:** Delete a question (soft delete)  
**Authentication:** Required (owner or admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question deleted successfully"
}
```

### POST /api/questions/:id/vote
**Purpose:** Vote on a question  
**Authentication:** Required

**Request Body:**
```json
{
  "type": "upvote"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vote recorded"
}
```

**Remove Vote (same type):**
```json
{
  "success": true,
  "message": "Vote removed"
}
```

**Update Vote (different type):**
```json
{
  "success": true,
  "message": "Vote updated"
}
```

---

## 💬 Answers API

### POST /api/answers
**Purpose:** Create an answer  
**Authentication:** Required

**Request Body:**
```json
{
  "content": "You can handle errors using try-catch blocks and middleware...",
  "question_id": "uuid-here"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Answer created successfully",
  "data": {
    "answer": {
      "id": "uuid-here",
      "answer": "You can handle errors using try-catch blocks and middleware...",
      "question_id": "uuid-here",
      "user_id": "uuid-here",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### PUT /api/answers/:id
**Purpose:** Update an answer  
**Authentication:** Required (owner only)

**Request Body:**
```json
{
  "content": "Updated answer: You can handle errors using try-catch blocks, middleware, and error event listeners..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Answer updated successfully",
  "data": {
    "answer": {
      "id": "uuid-here",
      "answer": "Updated answer: You can handle errors using try-catch blocks, middleware, and error event listeners...",
      "question_id": "uuid-here",
      "user_id": "uuid-here",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### DELETE /api/answers/:id
**Purpose:** Delete an answer (soft delete)  
**Authentication:** Required (owner or admin)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Answer deleted successfully"
}
```

### POST /api/answers/:id/vote
**Purpose:** Vote on an answer  
**Authentication:** Required

**Request Body:**
```json
{
  "type": "upvote"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vote recorded"
}
```

### POST /api/answers/:id/accept
**Purpose:** Accept an answer (question owner only)  
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Answer accepted successfully"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Only question owner can accept answers"
}
```

---

## 🙍‍♂️ Users API

### GET /api/users/:id
**Purpose:** Get user profile with statistics

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "created_at": "2024-01-01T00:00:00.000Z",
      "is_active": true,
      "stats": {
        "questions_count": 15,
        "answers_count": 23,
        "accepted_answers_count": 8
      }
    }
  }
}
```

### GET /api/users/:id/questions
**Purpose:** Get user's questions with pagination

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "id": "uuid-here",
        "title": "How to use async/await in JavaScript?",
        "description": "I'm confused about async/await syntax...",
        "user_id": "uuid-here",
        "created_at": "2024-01-01T00:00:00.000Z",
        "tags": [
          {
            "id": "uuid-here",
            "name": "javascript"
          }
        ],
        "answer_count": 3,
        "vote_count": 5
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "has_more": true
    }
  }
}
```

### GET /api/users/:id/answers
**Purpose:** Get user's answers with pagination

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "answers": [
      {
        "id": "uuid-here",
        "question_id": "uuid-here",
        "user_id": "uuid-here",
        "answer": "Async/await is a syntactic sugar for promises...",
        "is_accepted": true,
        "created_at": "2024-01-01T01:00:00.000Z",
        "question": {
          "id": "uuid-here",
          "title": "How to use async/await in JavaScript?"
        },
        "vote_count": 8
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "has_more": false
    }
  }
}
```

---

## 🏷️ Tags API

### GET /api/tags
**Purpose:** Get all tags with question counts

**Query Parameters:**
- `search` (string): Search tag names
- `limit` (number): Maximum tags to return (default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "uuid-here",
        "name": "javascript",
        "question_count": 145
      },
      {
        "id": "uuid-here",
        "name": "nodejs",
        "question_count": 89
      }
    ]
  }
}
```

### GET /api/tags/popular
**Purpose:** Get popular tags sorted by question count

**Query Parameters:**
- `limit` (number): Maximum tags to return (default: 10)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "uuid-here",
        "name": "javascript",
        "question_count": 145
      },
      {
        "id": "uuid-here",
        "name": "python",
        "question_count": 132
      }
    ]
  }
}
```

---

## 🔔 Notifications API

### GET /api/notifications
**Purpose:** Get user notifications  
**Authentication:** Required

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `unread_only` (boolean): Get only unread notifications

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid-here",
        "user_id": "uuid-here",
        "type": "answer",
        "message": "johndoe answered your question",
        "link": "/questions/uuid-here",
        "is_read": false,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "unread_count": 3,
    "pagination": {
      "page": 1,
      "limit": 20,
      "has_more": false
    }
  }
}
```

### PUT /api/notifications/:id/read
**Purpose:** Mark notification as read  
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### PUT /api/notifications/read-all
**Purpose:** Mark all notifications as read  
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

---

## 📤 Upload API

### POST /api/upload/image
**Purpose:** Upload an image to Cloudinary  
**Authentication:** Required

**Request:** Multipart form data with `image` field

**Success Response (200):**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1640995200/stackit/image.jpg",
    "public_id": "stackit/image"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "No image file provided"
}
```

---

## 🛠️ Admin API

**Note:** All admin routes require authentication and admin role.

### GET /api/admin/stats
**Purpose:** Get platform statistics  
**Authentication:** Required (Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "stats": {
      "users_count": 1250,
      "questions_count": 3420,
      "answers_count": 8930,
      "tags_count": 156
    }
  }
}
```

### GET /api/admin/users
**Purpose:** Get all users with pagination  
**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-here",
        "email": "john@example.com",
        "username": "johndoe",
        "role": "user",
        "is_active": true,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "has_more": true
    }
  }
}
```

### PUT /api/admin/users/:id/deactivate
**Purpose:** Deactivate a user  
**Authentication:** Required (Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

### PUT /api/admin/users/:id/activate
**Purpose:** Activate a user  
**Authentication:** Required (Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "User activated successfully"
}
```

### DELETE /api/admin/questions/:id
**Purpose:** Permanently delete a question  
**Authentication:** Required (Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Question deleted permanently"
}
```

### DELETE /api/admin/answers/:id
**Purpose:** Permanently delete an answer  
**Authentication:** Required (Admin only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Answer deleted permanently"
}
```

---

## 🧪 Testing Examples

### Complete Test Scenarios

#### 1. User Registration and Authentication Flow
```bash
# 1. Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "username": "testuser",
    "password": "testpassword123"
  }'

# Expected Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "testuser@example.com",
      "username": "testuser",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}

# 2. Login with the user
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpassword123"
  }'

# 3. Get current user info
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 2. Question Creation and Management Flow
```bash
# 1. Create a question
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "How to implement JWT authentication in Node.js?",
    "content": "I need help implementing JWT authentication in my Express.js application. What are the best practices?",
    "tags": ["nodejs", "jwt", "express", "authentication"]
  }'

# Expected Response:
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question": {
      "id": "uuid-here",
      "title": "How to implement JWT authentication in Node.js?",
      "description": "I need help implementing JWT authentication in my Express.js application. What are the best practices?",
      "user_id": "uuid-here",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}

# 2. Get all questions
curl -X GET "http://localhost:5000/api/questions?page=1&limit=5&sort=recent"

# 3. Get specific question
curl -X GET http://localhost:5000/api/questions/QUESTION_ID_HERE

# 4. Vote on question
curl -X POST http://localhost:5000/api/questions/QUESTION_ID_HERE/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "upvote"
  }'
```

#### 3. Answer Creation and Management Flow
```bash
# 1. Create an answer
curl -X POST http://localhost:5000/api/answers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "content": "To implement JWT authentication in Node.js, you need to install jsonwebtoken package, create middleware for token verification, and handle token generation on login.",
    "question_id": "QUESTION_ID_HERE"
  }'

# 2. Vote on answer
curl -X POST http://localhost:5000/api/answers/ANSWER_ID_HERE/vote \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "upvote"
  }'

# 3. Accept answer (question owner only)
curl -X POST http://localhost:5000/api/answers/ANSWER_ID_HERE/accept \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 4. Error Handling Test Cases
```bash
# Test invalid credentials
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@example.com",
    "password": "wrongpassword"
  }'

# Expected Response:
{
  "success": false,
  "message": "Invalid credentials"
}

# Test unauthorized access
curl -X POST http://localhost:5000/api/questions \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test question",
    "content": "Test content",
    "tags": ["test"]
  }'

# Expected Response:
{
  "success": false,
  "message": "Authentication required"
}

# Test rate limiting (after 100 requests)
# Expected Response:
{
  "error": "Too many requests from this IP, please try again later."
}
```

#### 5. File Upload Test
```bash
# Upload image
curl -X POST http://localhost:5000/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "image=@/path/to/your/image.jpg"

# Expected Response:
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/your-cloud/image/upload/v1640995200/stackit/image.jpg",
    "public_id": "stackit/image"
  }
}
```

#### 6. Admin Operations Test
```bash
# Get platform statistics (admin only)
curl -X GET http://localhost:5000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Get all users (admin only)
curl -X GET "http://localhost:5000/api/admin/users?page=1&limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"

# Deactivate user (admin only)
curl -X PUT http://localhost:5000/api/admin/users/USER_ID_HERE/deactivate \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Performance Test Scenarios

#### Load Testing with curl
```bash
# Test concurrent requests
for i in {1..50}; do
  curl -X GET http://localhost:5000/api/questions &
done
wait

# Test rate limiting
for i in {1..105}; do
  curl -X GET http://localhost:5000/api/questions
done
```

---

## 🔧 Environment Variables

### Required Environment Variables
```bash
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=24h

# File Upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Example .env File
```bash
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=24h

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

---

## 🚀 Getting Started

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the server
npm start

# Or start in development mode
npm run dev
```

### Quick Test
```bash
# Test server health
curl http://localhost:5000/health

# Expected Response:
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.5
}
```

---

## 📊 Database Schema Context

### Core Tables
- **users**: User account information
- **questions**: User-submitted questions
- **answers**: Answers to questions
- **tags**: Available tags for categorization
- **question_tags**: Many-to-many relationship between questions and tags
- **votes**: User votes on questions and answers
- **notifications**: User notification system

### Key Relationships
- Users can have many questions and answers
- Questions can have many answers and tags
- Answers belong to questions and users
- Votes belong to users and can be on questions or answers
- Notifications belong to users

---

## 🎯 Best Practices

### API Usage
1. Always include proper authentication headers
2. Handle rate limiting gracefully
3. Implement proper error handling
4. Use pagination for large data sets
5. Validate input data before sending requests

### Security Considerations
1. Never expose sensitive information in responses
2. Use HTTPS in production
3. Implement proper CORS configuration
4. Keep JWT tokens secure
5. Regularly rotate secrets

### Performance Optimization
1. Use appropriate pagination limits
2. Implement caching where possible
3. Optimize database queries
4. Use CDN for static assets
5. Monitor API performance metrics

---

*Last Updated: January 2024*
*Version: 1.0.0*