#!/usr/bin/env bash

if [ "$#" != 1 ] ; then
    echo "Please provide a version number for these containers: e.g. 0.1.0"
    exit -1
fi
VERSION="${1}"
mkdir docker-metadata

read -p '>> Build the containers? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    echo '>> Building the API container '
    docker buildx build --platform=linux/amd64,linux/arm64 \
        --no-cache \
        --rm \
        --metadata-file docker-metadata/api-metadata.json \
        -t arkisto/workspace-api:latest \
        -t arkisto/workspace-api:${VERSION} \
        -f Dockerfile.api-build .
    docker buildx build --load \
        --metadata-file docker-metadata/api-metadata.json \
        -t arkisto/workspace-api:latest \
        -t arkisto/workspace-api:${VERSION} \
        -f Dockerfile.api-build .

    echo

    echo ">> Building the TASK Runner container"
    docker buildx build --platform linux/amd64,linux/arm64 \
        --no-cache \
        --rm \
        --metadata-file docker-metadata/task-runnner-metadata.json \
        -t arkisto/workspace-task-runner:latest \
        -t arkisto/workspace-task-runner:${VERSION} \
        -f Dockerfile.tasks-build .
    docker buildx build --load \
        --metadata-file docker-metadata/task-runnner-metadata.json \
        -t arkisto/workspace-task-runner:latest \
        -t arkisto/workspace-task-runner:${VERSION} \
        -f Dockerfile.tasks-build .
    echo

    echo '>> Building the UI container'
    cd ui
    docker run -it --rm \
        -v $PWD:/srv/ui \
        -v ui_node_modules:/srv/ui/node_modules \
        -w /srv/ui node:14-buster bash -l -c "npm run build"
    cd -
    docker buildx build --platform=linux/amd64,linux/arm64 \
        --no-cache \
        --rm \
        --metadata-file docker-metadata/ui-metadata.json \
        -t arkisto/workspace-ui:latest \
        -t arkisto/workspace-ui:${VERSION} \
        -f Dockerfile.ui-build .
    docker buildx build --load \
        --metadata-file docker-metadata/ui-metadata.json \
        -t arkisto/workspace-ui:latest \
        -t arkisto/workspace-ui:${VERSION} \
        -f Dockerfile.ui-build .
    echo

    echo ">> Building the tusd container"
    docker buildx build --platform linux/amd64,linux/arm64 \
        --no-cache \
        --rm \
        --metadata-file docker-metadata/tusd-metadata.json \
        -t arkisto/workspace-tusd \
        -f Dockerfile.tus-build .
    docker buildx build --load \
        --metadata-file docker-metadata/tusd-metadata.json \
        -t arkisto/workspace-tusd \
        -f Dockerfile.tus-build .
    echo
fi

read -p '>> Tag the repo (select N if you are still testing the builds)? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    cd api
    npm version --no-git-tag-version ${VERSION}
    cd ../tasks
    npm version --no-git-tag-version ${VERSION}
    cd ../ui
    npm version --no-git-tag-version ${VERSION}
    cd ..
    git tag v${VERSION}
    git commit -a -m "tag and bump version"
fi

read -p '>> Push the containers to docker hub? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    docker login

    echo "Pushing built containers to docker hub"
    docker buildx build --platform=linux/amd64,linux/arm64 \
        --push \
        --rm \
        --metadata-file docker-metadata/api-metadata.json \
        -t arkisto/workspace-api:latest \
        -t arkisto/workspace-api:${VERSION} \
        -f Dockerfile.api-build .

    docker buildx build --platform=linux/amd64,linux/arm64 \
        --push \
        --rm \
        --metadata-file docker-metadata/task-runner-metadata.json \
        -t arkisto/workspace-task-runner:latest \
        -t arkisto/workspace-task-runner:${VERSION} \
        -f Dockerfile.tasks-build .

    docker buildx build --platform linux/amd64,linux/arm64 \
        --push \
        --rm \
        --metadata-file docker-metadata/ui-metadata.json \
        -t arkisto/workspace-ui:latest \
        -t arkisto/workspace-ui:${VERSION} \
        -f Dockerfile.ui-build .

    docker buildx build --platform linux/amd64,linux/arm64 \
        --push \
        --rm \
        --metadata-file docker-metadata/tusd-metadata.json \
        -t arkisto/workspace-tusd:latest \
        -t arkisto/workspace-tusd:${VERSION} \
        -f Dockerfile.tus-build .
fi

read -p '>> Remove local container copies? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    docker rmi arkisto/workspace-api:latest
    docker rmi arkisto/workspace-api:${VERSION}
    docker rmi arkisto/workspace-task-runner:latest
    docker rmi arkisto/workspace-task-runner:${VERSION}
    docker rmi arkisto/workspace-ui:latest
    docker rmi arkisto/workspace-ui:${VERSION}
    rm -rf docker-metadata
fi