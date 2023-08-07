#!/usr/bin/env bash

if [ "$#" != 1 ] ; then
    echo "Please provide a version number for these containers: e.g. 0.1.0"
    exit -1
fi
VERSION="${1}"

read -p '>> What is your github username? ' GITHUB_USERNAME
if [ -z "$GITHUB_USERNAME" ] ; then
    echo "Please provide your github username."
    exit -1
fi
echo ""
echo "Logging in to Github Container Registry"
echo " Provide a personal access token with the appropriate permissions"
echo ""
docker login ghcr.io --username GITHUB_USERNAME
[[ $? != 0 ]] && echo "Login to Github Container Registry failed" && exit -1


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
    # build the API container
    docker buildx build --push --rm --platform=linux/amd64 \
        -t ghcr.io/coedl/nyingarn-workspace-api:latest \
        -t ghcr.io/coedl/nyingarn-workspace-api:${VERSION} \
        -f Dockerfile.api-build .

    # build the Task Runner container
    docker buildx build --push --rm --platform=linux/amd64 \
        -t ghcr.io/coedl/nyingarn-workspace-task-runner:latest \
        -t ghcr.io/coedl/nyingarn-workspace-task-runner:${VERSION} \
        -f Dockerfile.tasks-build .

    # build the XML container
    docker buildx build --push --rm --platform=linux/amd64 \
        -t ghcr.io/coedl/nyingarn-workspace-xml-processor:latest \
        -t ghcr.io/coedl/nyingarn-workspace-xml-processor:${VERSION} \
        -f Dockerfile.xml-build .

    # build the UI container
    docker run -it --rm \
        -v $PWD/ui:/srv/ui \
        -v ui_node_modules:/srv/ui/node_modules \
        -w /srv/ui node:18-bullseye bash -l -c "npm run build"
    docker buildx build --push --rm --platform linux/amd64 \
        -t ghcr.io/coedl/nyingarn-workspace-ui:latest \
        -t ghcr.io/coedl/nyingarn-workspace-ui:${VERSION} \
        -f Dockerfile.ui-build .

    # build the UI Repository container
    docker run -it --rm \
        -v $PWD/ui-repository:/srv/ui \
        -v ui_node_modules:/srv/ui/node_modules \
        -w /srv/ui node:18-bullseye bash -l -c "npm run build"
    docker buildx build --push --rm --platform linux/amd64 \
        -t ghcr.io/coedl/nyingarn-repository-ui:latest \
        -t ghcr.io/coedl/nyingarn-repository-ui:${VERSION} \
        -f Dockerfile.ui-repository-build .
fi