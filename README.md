# StackIt - Q&A Platform

A full-stack Q&A platform similar to Stack Overflow, built with React frontend and Express.js backend.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone the repository

```bash
git clone <repository-url>
cd stackit
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file from example:
```bash
cp .env.example .env
```

Edit `.env` file with your Supabase credentials:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
```

Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```bash
cp .env.example .env
```

The frontend `.env` should contain:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Start the frontend development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:8080`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Questions
- `GET /api/questions` - Get all questions
- `GET /api/questions/:id` - Get single question
- `POST /api/questions` - Create question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/:id/vote` - Vote on question

### Answers
- `POST /api/answers` - Create answer
- `PUT /api/answers/:id` - Update answer
- `DELETE /api/answers/:id` - Delete answer
- `POST /api/answers/:id/vote` - Vote on answer
- `POST /api/answers/:id/accept` - Accept answer

### Tags
- `GET /api/tags` - Get all tags
- `GET /api/tags/popular` - Get popular tags

### Notifications
- `GET /api/notifications` - Get user notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read

## Database Schema

The application uses Supabase with the following main tables:
- `users` - User accounts
- `questions` - Questions posted by users
- `answers` - Answers to questions
- `tags` - Question tags
- `question_tags` - Many-to-many relationship between questions and tags
- `votes` - User votes on questions and answers
- `notifications` - User notifications

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

### Building for Production

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm run preview
```

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure:
1. Backend server is running on port 5000
2. Frontend is running on port 8080
3. Backend `.env` has `FRONTEND_URL=http://localhost:8080`

### Database Connection Issues
1. Check your Supabase URL and keys in backend `.env`
2. Ensure your Supabase project is active
3. Check network connectivity

### Port Conflicts
If ports 5000 or 8080 are in use:
1. Change `PORT` in backend `.env`
2. Update `VITE_API_BASE_URL` in frontend `.env`
3. Update `FRONTEND_URL` in backend `.env`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
