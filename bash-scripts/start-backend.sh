#!/bin/bash

# Spikey Coins Backend - PM2 Deployment Script
# This script deploys the Node.js backend using PM2
#
# Auto-detects git branch:
#   - main branch       → production (port 8000)
#   - development branch → dev server (port 8099)
#
# Usage:
#   ./start-backend.sh                    # Auto-detect from git branch
#   ./start-backend.sh --dev              # Force dev server (port 8099)
#   ./start-backend.sh --prod             # Force production (port 8000)
#   ./start-backend.sh --port 9000        # Start on custom port
#   ./start-backend.sh --name my-server   # Use custom process name
#
# Environment variables:
#   BACKEND_PORT=8001 ./start-backend.sh
#   BACKEND_NAME=my-custom-name ./start-backend.sh
#   BACKEND_ENV=dev ./start-backend.sh

# Default values
DEFAULT_PORT=8000
DEFAULT_DEV_PORT=8099
DEFAULT_NAME="spikey-coins-backend"
DEFAULT_DEV_NAME="spikey-coins-backend-dev"

# Initialize variables from environment or defaults
BACKEND_PORT="${BACKEND_PORT:-}"
BACKEND_NAME="${BACKEND_NAME:-}"
BACKEND_ENV="${BACKEND_ENV:-}"
IS_DEV=""
AUTO_DETECT=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            IS_DEV=true
            BACKEND_ENV="development"
            AUTO_DETECT=false
            shift
            ;;
        --prod|--production)
            IS_DEV=false
            BACKEND_ENV="production"
            AUTO_DETECT=false
            shift
            ;;
        --env)
            BACKEND_ENV="$2"
            AUTO_DETECT=false
            if [[ "$2" == "dev" || "$2" == "development" ]]; then
                IS_DEV=true
                BACKEND_ENV="development"
            else
                IS_DEV=false
            fi
            shift 2
            ;;
        --port)
            BACKEND_PORT="$2"
            shift 2
            ;;
        --name)
            BACKEND_NAME="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev              Force dev server (port 8099, name spikey-coins-backend-dev)"
            echo "  --prod             Force production server (port 8000)"
            echo "  --env ENV          Set environment (production|development|dev)"
            echo "  --port PORT        Set custom port (default: 8000, dev: 8099)"
            echo "  --name NAME        Set custom PM2 process name"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Auto-detection (default):"
            echo "  main branch        → production (port 8000)"
            echo "  development branch → dev server (port 8099)"
            echo ""
            echo "Environment variables:"
            echo "  BACKEND_PORT       Override default port"
            echo "  BACKEND_NAME       Override default process name"
            echo "  BACKEND_ENV        Set environment (production|development)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Auto-detect from git branch if not explicitly set
if [ "$AUTO_DETECT" = true ] && [ -z "$BACKEND_ENV" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ -n "$CURRENT_BRANCH" ]; then
        echo "🔍 Detected git branch: $CURRENT_BRANCH"
        if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
            IS_DEV=false
            BACKEND_ENV="production"
        elif [ "$CURRENT_BRANCH" = "development" ] || [ "$CURRENT_BRANCH" = "develop" ] || [ "$CURRENT_BRANCH" = "dev" ]; then
            IS_DEV=true
            BACKEND_ENV="development"
        else
            echo "⚠️  Unknown branch '$CURRENT_BRANCH', defaulting to development"
            IS_DEV=true
            BACKEND_ENV="development"
        fi
    else
        echo "⚠️  Not a git repository, defaulting to production"
        IS_DEV=false
        BACKEND_ENV="production"
    fi
fi

# Set defaults based on dev mode if not explicitly provided
if [ "$IS_DEV" = true ]; then
    BACKEND_PORT="${BACKEND_PORT:-$DEFAULT_DEV_PORT}"
    BACKEND_NAME="${BACKEND_NAME:-$DEFAULT_DEV_NAME}"
else
    BACKEND_PORT="${BACKEND_PORT:-$DEFAULT_PORT}"
    BACKEND_NAME="${BACKEND_NAME:-$DEFAULT_NAME}"
fi

echo "🚀 Starting Spikey Coins Backend with PM2..."
echo "   Environment: $BACKEND_ENV"
echo "   Port: $BACKEND_PORT"
echo "   Process Name: $BACKEND_NAME"
echo ""

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
    cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: '${BACKEND_NAME}',
    script: 'dist/app.js',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: ${BACKEND_PORT}
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: ${BACKEND_PORT},
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
pm2 stop "$BACKEND_NAME" 2>/dev/null || true
pm2 delete "$BACKEND_NAME" 2>/dev/null || true

# Start with PM2
echo "🚀 Starting backend with PM2..."
pm2 start ecosystem.config.cjs --env "$BACKEND_ENV"

# Show status
echo ""
echo "✅ Backend deployed successfully!"
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📊 Backend API: http://localhost:$BACKEND_PORT"
echo "🔄 Health Check: http://localhost:$BACKEND_PORT/"
echo "📈 Ticker Data: http://localhost:$BACKEND_PORT/api/ticker/24hr"
echo "📚 API Documentation: http://localhost:$BACKEND_PORT/docs"
echo ""
echo "🔧 Useful PM2 Commands:"
echo "   pm2 status                    - Show all processes"
echo "   pm2 logs $BACKEND_NAME - Show logs"
echo "   pm2 restart $BACKEND_NAME - Restart backend"
echo "   pm2 stop $BACKEND_NAME    - Stop backend"
echo "   pm2 monit                        - Monitor processes"
echo ""