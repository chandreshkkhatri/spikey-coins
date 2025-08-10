#!/bin/bash

# Spikey Coins - Start Script
# This script starts both the Node.js backend and React frontend

echo "🚀 Starting Spikey Coins Application..."

# Check if we're in the right directory
if [ ! -d "node-server" ] || [ ! -d "react-ui-nextjs" ]; then
    echo "❌ Error: Please run this script from the spikey-coins root directory"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
if ! command_exists node; then
    echo "❌ Error: Node.js is not installed"
    exit 1
fi

# Check for npm
if ! command_exists npm; then
    echo "❌ Error: npm is not installed"
    exit 1
fi

echo "📦 Installing dependencies..."

# Install backend dependencies
echo "   - Installing backend dependencies..."
cd node-server
if [ ! -d "node_modules" ]; then
    npm install
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in node-server/"
    echo "   Please copy .env.example to .env and configure your API keys"
fi

cd ..

# Install frontend dependencies
echo "   - Installing frontend dependencies..."
cd react-ui-nextjs
if [ ! -d "node_modules" ]; then
    npm install
fi

cd ..

echo "🚀 Starting servers..."

# Start backend server in background
echo "   - Starting backend server on port 8000..."
cd node-server
npm run dev &
BACKEND_PID=$!

cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "   - Starting frontend server on port 3000..."
cd react-ui-nextjs
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "✅ Both servers are starting up!"
echo ""
echo "📊 Backend API: http://localhost:8000"
echo "🌐 Frontend UI: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
