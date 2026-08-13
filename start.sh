#!/bin/bash

echo "Starting Chat Admin Dashboard..."

# Check if port 3000 is available
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "Port 3000 is already in use. Please kill the existing process first."
    exit 1
fi

# Start the server
echo "Server starting on port 3000..."
echo "Admin panel: http://localhost:3000/admin"
echo "Password: helloworld123"

node server.js