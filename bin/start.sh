#!/bin/bash

DOCKER_IMAGE="patient-order-api"
CONTAINER_NAME="patient-order-api"
ENV_FILE=".env" 

echo "Building Docker image '$DOCKER_IMAGE'..."
docker build -t $DOCKER_IMAGE

echo "Starting container $CONTAINER_NAME from image $DOCKER_IMAGE using env file $ENV_FILE..."
docker run --env-file $ENV_FILE -d -p 80:3000 $DOCKER_IMAGE

echo "✅ All done!"