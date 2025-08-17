#!/usr/bin/env python3
"""
Start RAG Server Script
Simplified startup for the RAG service
"""

import os
import subprocess
import sys

def install_requirements():
    """Install Python requirements"""
    try:
        print("Installing requirements...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'])
        print("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False

def start_server():
    """Start the RAG server"""
    try:
        print("Starting RAG server...")
        # Set environment variables
        os.environ.setdefault('RAG_PORT', '5000')
        
        # Start the server
        subprocess.check_call([sys.executable, 'rag_server.py'])
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
        sys.exit(0)

def main():
    """Main startup function"""
    print("🚀 Luma RAG Server Startup")
    print("=" * 30)
    
    # Change to the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    print(f"Working directory: {script_dir}")
    
    # Install requirements if needed
    if not os.path.exists('requirements.txt'):
        print("❌ requirements.txt not found")
        sys.exit(1)
    
    if not install_requirements():
        sys.exit(1)
    
    # Check for necessary files
    if not os.path.exists('rag_server.py'):
        print("❌ rag_server.py not found")
        sys.exit(1)
    
    # Start the server
    start_server()

if __name__ == '__main__':
    main()