# 📘 StackIt API Documentation

A comprehensive reference for developers using the **StackIt** backend API — a minimalistic Q&A platform designed for collaboration, community-driven knowledge sharing, and user interaction.

---

## 📑 Table of Contents

- [📦 Setup & Configuration](#-setup--configuration)
- [🚀 Getting Started](#-getting-started)
- [👤 Auth API](#-auth-api)
- [🙍‍♂️ Users API](#-users-api)
- [❓ Questions API](#-questions-api)
- [💬 Answers API](#-answers-api)
- [🏷️ Tags API](#-tags-api)
- [📤 Uploads API](#-uploads-api)
- [🔔 Notifications API](#-notifications-api)
- [🛠️ Admin API](#-admin-api)
- [⚙️ Middleware](#️-middleware)
- [🔐 Environment Variables](#-environment-variables)
- [📌 Usage Tips](#-usage-tips)

---

## 📦 Setup & Configuration

This project uses **Express.js** and integrates with **Supabase** for authentication or storage features.

### Folder Structure Overview

```
config/
├── supabase.js         # Supabase setup

middleware/
├── errorHandler.js     # Global error handling
├── validation.js       # Request validation logic

routes/
├── admin.js
├── answers.js
├── auth.js
├── notifications.js
├── questions.js
├── tags.js
├── upload.js
├── users.js

.env                    # Environment variables
server.js              # App entry point
scr.js                 # Possibly old entry file or unused
```

---

## 🚀 Getting Started

```bash
npm install
node server.js
```

Use [Postman](https://www.postman.com/) or `curl` to interact with API endpoints.

---

## 👤 Auth API

### `POST /api/auth/register`

Registers a new user.

#### Request Body

| Field     | Type   | Required | Description          |
|-----------|--------|----------|----------------------|
| username  | string | ✅       | Unique username      |
| email     | string | ✅       | User's email address |
| password  | string | ✅       | Minimum 6 characters |

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "secret123"
}
```

#### Response

```json
{
  "message": "User registered successfully.",
  "userId": "xyz123"
}
```

---

### `POST /api/auth/login`

Logs in a user and returns an authentication token.

#### Request Body

```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

#### Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
```

---

## 🙍‍♂️ Users API

### `GET /api/users/:id`

Returns the user profile for the given `id`.

---

### `PATCH /api/users/:id`

Updates a user's profile.

---

## ❓ Questions API

### `GET /api/questions/`

Fetches all questions.

---

### `POST /api/questions/`

Submits a new question.

#### Request Body

```json
{
  "title": "How does Supabase authentication work?",
  "description": "I'm trying to integrate Supabase with Express.js.",
  "tags": ["supabase", "auth"]
}
```

---

### `GET /api/questions/:id`

Fetch a specific question and its answers.

---

### `DELETE /api/questions/:id`

Deletes a question (owner or admin).

---

## 💬 Answers API

### `POST /api/answers/:questionId`

Submits an answer to a question.

#### Request Body

```json
{
  "content": "You need to set up Supabase client with your project URL and API key."
}
```

---

### `GET /api/answers/:questionId`

Fetches all answers for a specific question.

---

## 🏷️ Tags API

### `GET /api/tags/`

Returns all tags.

---

## 📤 Uploads API

### `POST /api/upload/`

Uploads an image or attachment (used in rich text editor or user profile).

---

## 🔔 Notifications API

### `GET /api/notifications/:userId`

Returns all notifications for a specific user.

---

## 🛠️ Admin API

(Admin features: may include moderation, stats)

### `GET /api/admin/users`

List all users (Admin only)

---

## ⚙️ Middleware

- **errorHandler.js** — centralized error response formatting
- **validation.js** — handles schema validations using `express-validator` or similar

---

## 🔐 Environment Variables

Set the following in `.env`:

| Variable Name         | Description                    |
|-----------------------|--------------------------------|
| `PORT`                | Port to run server             |
| `SUPABASE_URL`        | Supabase project URL           |
| `SUPABASE_ANON_KEY`   | Supabase anonymous key         |
| `JWT_SECRET`          | Token signing key              |
| `DB_URI`              | MongoDB connection string      |

---

## 📌 Usage Tips

### Start Server

```bash
node server.js
```

### Example curl Request

```bash
curl -X POST http://localhost:3000/api/questions/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{"title":"How to use middleware in Express?", "description":"...", "tags":["express","middleware"]}'
```
