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


DOCKER_IMAGE="patient-order-api"
CONTAINER_NAME="patient-order-api"
ENV_FILE=".env" 

echo "Starting container $CONTAINER_NAME from image $DOCKER_IMAGE using env file $ENV_FILE..."
docker run --env-file $ENV_FILE -d -p 80:3000 $DOCKER_IMAGE

echo "✅ All done!"
