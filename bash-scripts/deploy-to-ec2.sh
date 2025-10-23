#!/bin/bash

# Deploy Pre-built Backend to EC2
# This script builds locally and deploys to EC2, avoiding memory issues

echo "🚀 Deploying Spikey Coins Backend to EC2..."

# Configuration
EC2_USER="${EC2_USER:-ubuntu}"
EC2_HOST="${EC2_HOST}"
EC2_PATH="${EC2_PATH:-~/spikey-coins}"

if [ -z "$EC2_HOST" ]; then
    echo "❌ Error: EC2_HOST environment variable not set"
    echo "   Usage: EC2_HOST=your-ec2-ip.amazonaws.com ./deploy-to-ec2.sh"
    exit 1
fi

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
ssh "$EC2_USER@$EC2_HOST" << 'ENDSSH'
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

    # Restart with PM2
    pm2 restart ecosystem.config.cjs --env production || pm2 start ecosystem.config.cjs --env production

    echo "✅ Deployment complete!"
    pm2 status
ENDSSH

# Cleanup
rm deploy.tar.gz

echo ""
echo "✅ Deployment to EC2 complete!"
echo ""
echo "🔧 Useful commands:"
echo "   ssh $EC2_USER@$EC2_HOST"
echo "   ssh $EC2_USER@$EC2_HOST 'pm2 logs spikey-coins-backend'"
echo "   ssh $EC2_USER@$EC2_HOST 'pm2 restart spikey-coins-backend'"
echo ""
