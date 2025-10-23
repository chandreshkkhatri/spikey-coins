#!/bin/bash

# Spikey Coins - Start Script with PM2
# This script deploys both the Node.js backend and React frontend using PM2

echo "🚀 Starting Spikey Coins Application with PM2..."

# Check if we're in the right directory
if [ ! -d "node-server" ] || [ ! -d "ui" ] || [ ! -d "bash-scripts" ]; then
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

# Check for PM2
if ! command_exists pm2; then
    echo "📦 PM2 not found, installing globally..."
    npm install -g pm2
fi

echo "📦 Checking dependencies..."

# Check backend dependencies
if [ ! -d "node-server/node_modules" ]; then
    echo "   - Installing backend dependencies..."
    cd node-server && npm install && cd ..
fi

# Check frontend dependencies
if [ ! -d "ui/node_modules" ]; then
    echo "   - Installing frontend dependencies..."
    cd ui && npm install && cd ..
fi

echo "🚀 Deploying with PM2..."

# Deploy backend first (priority)
echo "   - Deploying backend server..."
cd bash-scripts
./start-backend.sh
cd ..

echo ""
read -p "🤔 Do you want to also start the frontend? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   - Deploying frontend server..."
    cd bash-scripts
    ./start-frontend.sh
    cd ..
    
    echo ""
    echo "✅ Both servers deployed successfully!"
    echo ""
    echo "📊 Backend API: http://localhost:8000"
    echo "🌐 Frontend UI: http://localhost:3000"
else
    echo ""
    echo "✅ Backend deployed successfully!"
    echo ""
    echo "📊 Backend API: http://localhost:8000"
fi

echo ""
echo "🔧 Useful PM2 Commands:"
echo "   pm2 status                        - Show all processes"
echo "   pm2 logs                          - Show all logs"
echo "   pm2 monit                         - Monitor processes"
echo "   pm2 restart all                   - Restart all processes"
echo "   pm2 stop all                      - Stop all processes"
echo "   pm2 delete all                    - Delete all processes"
echo ""
echo "📚 Individual Scripts:"
echo "   ./bash-scripts/start-backend.sh   - Deploy only backend"
echo "   ./bash-scripts/start-frontend.sh  - Deploy only frontend"
echo ""
