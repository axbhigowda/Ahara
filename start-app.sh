#!/bin/bash

echo "🚀 Starting Ahara Food Delivery App..."

# Start Backend
echo "📦 Starting Backend Server..."
cd /home/axbhi/projects/Ahara/backend
node server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start Frontend
echo "🎨 Starting Frontend App..."
cd /home/axbhi/projects/Ahara/customer-app
npm start &
FRONTEND_PID=$!

echo "✅ Both servers started!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Backend running on: http://localhost:5000"
echo "Frontend running on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
