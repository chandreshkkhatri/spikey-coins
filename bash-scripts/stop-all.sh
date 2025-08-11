#!/bin/bash

# Spikey Coins - Stop All Services
# This script stops all PM2 processes for Spikey Coins

echo "🛑 Stopping all Spikey Coins services..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for PM2
if ! command_exists pm2; then
    echo "❌ Error: PM2 is not installed"
    exit 1
fi

# Stop specific services
echo "   - Stopping backend server..."
pm2 stop spikey-coins-backend 2>/dev/null || echo "   Backend not running"

echo "   - Stopping frontend server..."
pm2 stop spikey-coins-frontend 2>/dev/null || echo "   Frontend not running"

# Show status
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ All services stopped!"
echo ""
echo "🔧 To completely remove processes:"
echo "   pm2 delete spikey-coins-backend"
echo "   pm2 delete spikey-coins-frontend"
echo "   pm2 delete all  # Remove all processes"
echo ""