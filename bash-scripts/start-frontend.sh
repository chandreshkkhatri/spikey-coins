#!/bin/bash

# Spikey Coins Frontend - PM2 Deployment Script
# This script deploys the Next.js frontend using PM2

echo "🚀 Starting Spikey Coins Frontend with PM2..."

# Check if we're in the right directory
if [ ! -d "../react-ui-nextjs" ]; then
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

echo "📦 Installing frontend dependencies..."
cd ../react-ui-nextjs

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "🔧 Configuring PM2..."

# Create PM2 ecosystem file if it doesn't exist
if [ ! -f "ecosystem.config.js" ]; then
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'spikey-coins-frontend',
    script: 'node_modules/next/dist/bin/next',
    args: 'dev --port 3000',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:8000'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:8000'
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
    echo "✅ Created PM2 ecosystem configuration"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Stop existing instance if running
echo "🛑 Stopping existing frontend instance..."
pm2 stop spikey-coins-frontend 2>/dev/null || true
pm2 delete spikey-coins-frontend 2>/dev/null || true

# Start with PM2
echo "🚀 Starting frontend with PM2..."
pm2 start ecosystem.config.js

# Show status
echo ""
echo "✅ Frontend deployed successfully!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "🌐 Frontend UI: http://localhost:3000"
echo ""
echo "🔧 Useful PM2 Commands:"
echo "   pm2 status                     - Show all processes"
echo "   pm2 logs spikey-coins-frontend - Show logs"
echo "   pm2 restart spikey-coins-frontend - Restart frontend"
echo "   pm2 stop spikey-coins-frontend    - Stop frontend"
echo "   pm2 monit                         - Monitor processes"
echo ""