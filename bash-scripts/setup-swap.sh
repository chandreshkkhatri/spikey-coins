#!/bin/bash

# Setup Swap Space for Low-Memory EC2 Instances
# This script creates a 2GB swap file to help with memory-intensive operations like TypeScript compilation

echo "🔧 Setting up swap space for EC2 instance..."

# Check if swap already exists
if swapon --show | grep -q '/swapfile'; then
    echo "✅ Swap already configured!"
    swapon --show
    exit 0
fi

echo "📦 Creating 2GB swap file..."
sudo fallocate -l 2G /swapfile

echo "🔒 Setting permissions..."
sudo chmod 600 /swapfile

echo "🔨 Setting up swap space..."
sudo mkswap /swapfile

echo "✅ Enabling swap..."
sudo swapon /swapfile

echo "📝 Making swap permanent..."
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo ""
echo "✅ Swap configured successfully!"
echo ""
echo "📊 Current swap status:"
swapon --show
free -h

echo ""
echo "💡 To adjust swappiness (how aggressively Linux uses swap):"
echo "   sudo sysctl vm.swappiness=10"
echo "   (Default is 60, lower = less swap usage)"
echo ""
