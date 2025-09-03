#!/bin/bash
# Luma AI Android Deployment Script

set -e

echo "🚀 Starting Luma AI Android deployment process..."

# Check if required tools are installed
check_tools() {
    echo "📋 Checking required tools..."
    
    if ! command -v expo &> /dev/null; then
        echo "❌ Expo CLI not found. Installing..."
        npm install -g @expo/cli
    else
        echo "✅ Expo CLI found"
    fi
    
    if ! command -v eas &> /dev/null; then
        echo "❌ EAS CLI not found. Installing..."
        npm install -g eas-cli
    else
        echo "✅ EAS CLI found"
    fi
}

# Setup project
setup_project() {
    echo "🔧 Setting up project..."
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm install
    
    # Login to Expo (if not already)
    echo "🔐 Checking Expo authentication..."
    if ! expo whoami &> /dev/null; then
        echo "Please login to Expo:"
        expo login
    else
        echo "✅ Already logged in to Expo"
    fi
    
    # Initialize EAS if not already done
    if [ ! -f "eas.json" ]; then
        echo "🏗️ Initializing EAS project..."
        eas init
    else
        echo "✅ EAS project already initialized"
    fi
}

# Validate environment
validate_env() {
    echo "🔍 Validating environment variables..."
    
    if [ ! -f ".env" ]; then
        echo "⚠️ .env file not found. Copying from parent directory..."
        cp ../.env .env 2>/dev/null || echo "❌ Could not find .env file in parent directory"
    fi
    
    # Check for required assets
    echo "🎨 Checking required assets..."
    mkdir -p assets
    
    if [ ! -f "assets/icon.png" ]; then
        echo "⚠️ App icon (assets/icon.png) not found. Using placeholder."
        # You'll need to add actual icon files
    fi
}

# Build functions
build_preview() {
    echo "🔨 Building preview version (APK)..."
    eas build --platform android --profile preview --non-interactive
}

build_production() {
    echo "🔨 Building production version (AAB)..."
    eas build --platform android --profile production --non-interactive
}

# Main deployment function
deploy() {
    local build_type=${1:-"preview"}
    
    echo "🚀 Starting deployment with build type: $build_type"
    
    check_tools
    setup_project
    validate_env
    
    if [ "$build_type" == "production" ]; then
        echo "⚠️ Building for production - this will create a release build!"
        read -p "Are you sure? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            build_production
        else
            echo "❌ Production build cancelled"
            exit 1
        fi
    else
        build_preview
    fi
    
    echo "✅ Build process completed!"
    echo "📱 Check your EAS dashboard for download links: https://expo.dev/"
}

# Help function
show_help() {
    echo "Luma AI Android Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  preview     Build preview APK for testing (default)"
    echo "  production  Build production AAB for Play Store"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh preview     # Build test APK"
    echo "  ./deploy.sh production  # Build for Play Store"
}

# Script entry point
case "${1:-preview}" in
    "preview")
        deploy "preview"
        ;;
    "production")
        deploy "production"
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        echo "❌ Unknown option: $1"
        show_help
        exit 1
        ;;
esac