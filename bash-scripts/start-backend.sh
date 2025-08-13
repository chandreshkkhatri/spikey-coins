#!/bin/bash

# Spikey Coins Backend - PM2 Deployment Script
# This script deploys the Node.js backend using PM2

echo "🚀 Starting Spikey Coins Backend with PM2..."

# Check if we're in the right directory
if [ ! -d "../node-server" ]; then
    echo "❌ Error: Please run this script from the bash-scripts directory"
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

echo "📦 Installing backend dependencies..."
cd ../node-server

# Always install/update dependencies to ensure all packages are available
npm install

echo "🔨 Building TypeScript..."
npm run build

# Verify build was successful
if [ ! -f "dist/app.js" ]; then
    echo "❌ Error: Build failed - dist/app.js not found"
    exit 1
fi
echo "✅ TypeScript build successful"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in node-server/"
    echo "   Please copy .env.example to .env and configure your API keys"
fi

echo "🔧 Configuring PM2..."

# Remove any old ecosystem configs
rm -f ecosystem.config.js ecosystem.config.cjs 2>/dev/null || true

# Create PM2 ecosystem file
echo "✅ Creating new PM2 ecosystem configuration..."
    cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'spikey-coins-backend',
    script: 'dist/app.js',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 8000,
      LOG_LEVEL_CONSOLE: 'info',
      LOG_LEVEL_FILE: 'info'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000
  }]
}
EOF

# Test the built app quickly
echo "🧪 Testing built application..."
timeout 5 node dist/app.js > /dev/null 2>&1 || {
    echo "⚠️  Warning: App test failed, but proceeding with PM2 deployment"
}

# Stop existing instance if running
echo "🛑 Stopping existing backend instance..."
pm2 stop spikey-coins-backend 2>/dev/null || true
pm2 delete spikey-coins-backend 2>/dev/null || true

# Start with PM2
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.cjs --env development

# Show status
echo ""
echo "✅ Backend deployed successfully!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📊 Backend API: http://localhost:8000"
echo "🔄 Health Check: http://localhost:8000/"
echo "📈 Ticker Data: http://localhost:8000/api/ticker/24hr"
echo "📚 API Documentation: http://localhost:8000/docs"
echo ""
echo "🔧 Useful PM2 Commands:"
echo "   pm2 status                    - Show all processes"
echo "   pm2 logs spikey-coins-backend - Show logs"
echo "   pm2 restart spikey-coins-backend - Restart backend"
echo "   pm2 stop spikey-coins-backend    - Stop backend"
echo "   pm2 monit                        - Monitor processes"
echo ""