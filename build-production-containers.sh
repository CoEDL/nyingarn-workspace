#!/usr/bin/env bash

if [ "$#" != 1 ] ; then
    echo "Please provide a version number for these containers: e.g. 0.1.0"
    exit -1
fi
VERSION="${1}"
mkdir docker-metadata

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


read -p '>> Build the containers and push to docker hub? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    docker login

    docker buildx build --push --rm --platform=linux/amd64,linux/arm64 \
        -t arkisto/workspace-api:latest \
        -t arkisto/workspace-api:${VERSION} \
        -f Dockerfile.api-build .

    docker buildx build --push --rm --platform=linux/amd64,linux/arm64 \
        -t arkisto/workspace-task-runner:latest \
        -t arkisto/workspace-task-runner:${VERSION} \
        -f Dockerfile.tasks-build .

    docker run -it --rm \
        -v $PWD/ui:/srv/ui \
        -v ui_node_modules:/srv/ui/node_modules \
        -w /srv/ui node:14-buster bash -l -c "npm run build"
    docker buildx build --push --rm --platform linux/amd64,linux/arm64 \
        -t arkisto/workspace-ui:latest \
        -t arkisto/workspace-ui:${VERSION} \
        -f Dockerfile.ui-build .

    docker buildx build --push --rm --platform linux/amd64,linux/arm64 \
        -t arkisto/workspace-tusd:latest \
        -t arkisto/workspace-tusd:${VERSION} \
        -f Dockerfile.tus-build .
fi