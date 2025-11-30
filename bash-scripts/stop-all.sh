#!/bin/bash

# Spikey Coins - Stop All Services
# This script stops all PM2 processes for Spikey Coins
#
# Usage:
#   ./stop-all.sh              # Stop all spikey-coins services
#   ./stop-all.sh --dev        # Stop only dev backend
#   ./stop-all.sh --prod       # Stop only production backend
#   ./stop-all.sh --name NAME  # Stop specific service by name

echo "🛑 Stopping Spikey Coins services..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for PM2
if ! command_exists pm2; then
    echo "❌ Error: PM2 is not installed"
    exit 1
fi

# Parse arguments
STOP_DEV=true
STOP_PROD=true
STOP_FRONTEND=true
CUSTOM_NAME=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            STOP_DEV=true
            STOP_PROD=false
            STOP_FRONTEND=false
            shift
            ;;
        --prod)
            STOP_DEV=false
            STOP_PROD=true
            STOP_FRONTEND=false
            shift
            ;;
        --name)
            CUSTOM_NAME="$2"
            STOP_DEV=false
            STOP_PROD=false
            STOP_FRONTEND=false
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev          Stop only dev backend (spikey-coins-backend-dev)"
            echo "  --prod         Stop only production backend (spikey-coins-backend)"
            echo "  --name NAME    Stop specific service by name"
            echo "  --help, -h     Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Stop specific service if name provided
if [ -n "$CUSTOM_NAME" ]; then
    echo "   - Stopping $CUSTOM_NAME..."
    pm2 stop "$CUSTOM_NAME" 2>/dev/null || echo "   $CUSTOM_NAME not running"
else
    # Stop specific services based on flags
    if [ "$STOP_PROD" = true ]; then
        echo "   - Stopping production backend server..."
        pm2 stop spikey-coins-backend 2>/dev/null || echo "   Production backend not running"
    fi

    if [ "$STOP_DEV" = true ]; then
        echo "   - Stopping dev backend server..."
        pm2 stop spikey-coins-backend-dev 2>/dev/null || echo "   Dev backend not running"
    fi

    if [ "$STOP_FRONTEND" = true ]; then
        echo "   - Stopping frontend server..."
        pm2 stop spikey-coins-frontend 2>/dev/null || echo "   Frontend not running"
    fi
fi

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ Services stopped!"
echo ""
echo "🔧 To completely remove processes:"
echo "   pm2 delete spikey-coins-backend"
echo "   pm2 delete spikey-coins-backend-dev"
echo "   pm2 delete spikey-coins-frontend"
echo "   pm2 delete all  # Remove all processes"
echo ""