#!/bin/bash

echo "🚀 Setting up GHL Workflow Debugger MVP"
echo "======================================="

# Backend setup
echo "📦 Installing backend dependencies..."
cd backend
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit backend/.env with your credentials"
fi

# Frontend setup
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Edit backend/.env with your credentials"
echo "2. In backend directory: npm run dev"
echo "3. In frontend directory: npm start"
echo ""
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:3001"