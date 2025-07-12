#!/bin/bash

# StackIt - Development Startup Script

echo "🚀 Starting StackIt Development Environment"
echo "========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use. Please stop the service using this port."
        return 1
    fi
    return 0
}

# Check if required ports are available
echo "🔍 Checking port availability..."
if ! check_port 5000; then
    echo "   Backend port 5000 is occupied"
    exit 1
fi

if ! check_port 8080; then
    echo "   Frontend port 8080 is occupied"
    exit 1
fi

echo "✅ Ports are available"

# Setup backend
echo "🔧 Setting up backend..."
cd backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Backend .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit backend/.env with your Supabase credentials before continuing."
    echo "   Required: SUPABASE_URL, SUPABASE_ANON_KEY, JWT_SECRET"
    read -p "Press Enter after you've configured the .env file..."
fi

# Install backend dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Start backend in background
echo "🚀 Starting backend server on port 5000..."
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! curl -f http://localhost:5000/health >/dev/null 2>&1; then
    echo "❌ Backend failed to start. Check the logs above."
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend is running"

# Setup frontend
echo "🔧 Setting up frontend..."
cd ../frontend

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating frontend .env file..."
    cp .env.example .env
fi

# Install frontend dependencies
if [ ! -d node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
echo "🚀 Starting frontend server on port 8080..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
sleep 10

echo ""
echo "🎉 StackIt is now running!"
echo "================================"
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend:  http://localhost:5000"
echo "📚 API Docs: http://localhost:5000/api"
echo ""
echo "To stop the servers, press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait