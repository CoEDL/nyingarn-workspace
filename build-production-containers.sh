#!/usr/bin/env bash


VERSION=$(grep version api/package.json | awk -F ': ' '{ print $2 }' | sed 's/"//g' | sed 's/,//' )

# build the API container
docker build --push --rm \
    -t ghcr.io/coedl/nyingarn-workspace-api:latest \
    -t ghcr.io/coedl/nyingarn-workspace-api:${VERSION} \
    -f Dockerfile.api-build .

# build the Task Runner container
docker build --push --rm \
    -t ghcr.io/coedl/nyingarn-workspace-task-runner:latest \
    -t ghcr.io/coedl/nyingarn-workspace-task-runner:${VERSION} \
    -f Dockerfile.tasks-build .

# build the XML container
docker build --push --rm \
    -t ghcr.io/coedl/nyingarn-workspace-xml-processor:latest \
    -t ghcr.io/coedl/nyingarn-workspace-xml-processor:${VERSION} \
    -f Dockerfile.xml-build .

# build the UI container
cd ui
npm run build
docker build --push --rm \
    -t ghcr.io/coedl/nyingarn-workspace-ui:latest \
    -t ghcr.io/coedl/nyingarn-workspace-ui:${VERSION} \
    -f Dockerfile.ui-build .

# build the UI Repository container
cd -
cd ui-repository
npm run build
docker build --push --rm \
    -t ghcr.io/coedl/nyingarn-repository-ui:latest \
    -t ghcr.io/coedl/nyingarn-repository-ui:${VERSION} \
    -f Dockerfile.ui-repository-build .