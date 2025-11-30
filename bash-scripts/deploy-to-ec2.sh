#!/bin/bash

# Deploy Pre-built Backend to EC2
# This script builds locally and deploys to EC2, avoiding memory issues
#
# Usage:
#   EC2_HOST=your-ip ./deploy-to-ec2.sh                  # Deploy production
#   EC2_HOST=your-ip ./deploy-to-ec2.sh --dev            # Deploy dev server
#   EC2_HOST=your-ip ./deploy-to-ec2.sh --port 9000      # Custom port
#   EC2_HOST=your-ip ./deploy-to-ec2.sh --name my-app    # Custom process name
#
# Environment variables:
#   EC2_HOST    - Required: EC2 hostname or IP
#   EC2_USER    - SSH user (default: ubuntu)
#   EC2_PATH    - Remote path (default: ~/spikey-coins)
#   BACKEND_PORT - Server port (default: 8000, dev: 8001)
#   BACKEND_NAME - PM2 process name (default: spikey-coins-backend)
#   BACKEND_ENV  - Environment: production|development

echo "🚀 Deploying Spikey Coins Backend to EC2..."

# Configuration
EC2_USER="${EC2_USER:-ubuntu}"
EC2_HOST="${EC2_HOST}"
EC2_PATH="${EC2_PATH:-~/spikey-coins}"

# Default values
DEFAULT_PORT=8000
DEFAULT_DEV_PORT=8099
DEFAULT_NAME="spikey-coins-backend"
DEFAULT_DEV_NAME="spikey-coins-backend-dev"

# Initialize variables
BACKEND_PORT="${BACKEND_PORT:-}"
BACKEND_NAME="${BACKEND_NAME:-}"
BACKEND_ENV="${BACKEND_ENV:-production}"
IS_DEV=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            IS_DEV=true
            BACKEND_ENV="development"
            shift
            ;;
        --env)
            BACKEND_ENV="$2"
            if [[ "$2" == "dev" || "$2" == "development" ]]; then
                IS_DEV=true
                BACKEND_ENV="development"
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
            echo "Usage: EC2_HOST=<host> $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev              Deploy as dev server (port 8001)"
            echo "  --env ENV          Set environment (production|development)"
            echo "  --port PORT        Set custom port"
            echo "  --name NAME        Set custom PM2 process name"
            echo "  --help, -h         Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  EC2_HOST           Required: EC2 hostname or IP"
            echo "  EC2_USER           SSH user (default: ubuntu)"
            echo "  EC2_PATH           Remote path (default: ~/spikey-coins)"
            echo "  BACKEND_PORT       Override default port"
            echo "  BACKEND_NAME       Override default process name"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Set defaults based on dev mode if not explicitly provided
if [ "$IS_DEV" = true ]; then
    BACKEND_PORT="${BACKEND_PORT:-$DEFAULT_DEV_PORT}"
    BACKEND_NAME="${BACKEND_NAME:-$DEFAULT_DEV_NAME}"
else
    BACKEND_PORT="${BACKEND_PORT:-$DEFAULT_PORT}"
    BACKEND_NAME="${BACKEND_NAME:-$DEFAULT_NAME}"
fi

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2_HOST environment variable not set"
    echo "   Usage: EC2_HOST=your-ec2-ip.amazonaws.com ./deploy-to-ec2.sh"
    exit 1
fi

echo "   Environment: $BACKEND_ENV"
echo "   Port: $BACKEND_PORT"
echo "   Process Name: $BACKEND_NAME"
echo ""

echo "📦 Building locally..."
cd ../node-server

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful!"

# Generate ecosystem config with dynamic values
echo "🔧 Generating PM2 ecosystem config..."
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

echo "📤 Deploying to EC2..."

# Create deployment package (exclude heavy files)
echo "   Creating deployment package..."
tar czf deploy.tar.gz \
    dist/ \
    package.json \
    package-lock.json \
    ecosystem.config.cjs \
    .env.example \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='*.log'

# Upload to EC2
echo "   Uploading to $EC2_USER@$EC2_HOST..."
scp deploy.tar.gz "$EC2_USER@$EC2_HOST:~/"

# Extract and setup on EC2
echo "   Setting up on EC2..."
ssh "$EC2_USER@$EC2_HOST" << ENDSSH
    # Create directory if needed
    mkdir -p ~/spikey-coins/node-server
    cd ~/spikey-coins/node-server

    # Extract deployment
    tar xzf ~/deploy.tar.gz
    rm ~/deploy.tar.gz

    # Install production dependencies only (no devDependencies = less memory)
    npm install --production

    # Setup PM2 if not already done
    if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
    fi

    # Stop and delete existing process with same name
    pm2 stop ${BACKEND_NAME} 2>/dev/null || true
    pm2 delete ${BACKEND_NAME} 2>/dev/null || true

    # Restart with PM2
    pm2 start ecosystem.config.cjs --env ${BACKEND_ENV}

    echo "✅ Deployment complete!"
    pm2 status
ENDSSH

# Cleanup
rm deploy.tar.gz

echo ""
echo "✅ Deployment to EC2 complete!"
echo ""
echo "   Process: $BACKEND_NAME"
echo "   Port: $BACKEND_PORT"
echo "   Environment: $BACKEND_ENV"
echo ""
echo "🔧 Useful commands:"
echo "   ssh $EC2_USER@$EC2_HOST"
echo "   ssh $EC2_USER@$EC2_HOST 'pm2 logs $BACKEND_NAME'"
echo "   ssh $EC2_USER@$EC2_HOST 'pm2 restart $BACKEND_NAME'"
echo ""
