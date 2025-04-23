#!/bin/bash

set -e

echo "Stopping Docker..."
sudo systemctl stop docker

echo "Starting Docker..."
sudo systemctl start docker

echo "Removing all containers..."
docker container rm -f $(docker container ls -aq) 2>/dev/null || echo "No containers to remove."

echo "Removing all images..."
docker image rm -f $(docker image ls -aq) 2>/dev/null || echo "No images to remove."

echo "Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || echo "No volumes to remove."
