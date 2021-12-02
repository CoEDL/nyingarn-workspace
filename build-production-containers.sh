#!/usr/bin/env bash

if [ "$#" != 1 ] ; then
    echo "Please provide a version number for these containers: e.g. 0.1.0"
    exit -1
fi
VERSION="${1}"

read -p '>> Build the code? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    echo '>> Building the API code'
    docker build --rm -t arkisto/workspace-api:latest -f Dockerfile.api-build .
    echo

    echo '>> Building the TASKS code'
    docker build --rm -t arkisto/workspace-task-runner:latest -f Dockerfile.tasks-build .
    echo

    echo '>> Building the UI code'
    cd ui
    # npm run build
    docker run -it --rm \
        -v $PWD:/srv/ui \
        -v ui_node_modules:/srv/ui/node_modules \
        -w /srv/ui node:14-buster bash -l -c "npm run build"
    cd -
    echo
fi

read -p '>> Build the containers? [y|N] ' resp
if [ "$resp" == "y" ] ; then

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

    echo "Building API container"
    docker tag arkisto/workspace-api:latest arkisto/workspace-api:${VERSION}

    echo "Building TASK Runner container"
    docker tag arkisto/workspace-task-runner:latest arkisto/workspace-task-runner:${VERSION}

    echo "Building UI container"
    docker build --rm -t arkisto/workspace-ui:latest -f Dockerfile.ui-build .
    docker tag arkisto/workspace-ui:latest arkisto/workspace-ui:${VERSION}

    # docker rmi $(docker images | grep none | awk '{print $3}')
    echo
fi

read -p '>> Push the containers to docker hub? [y|N] ' resp
if [ "$resp" == "y" ] ; then
    echo "Pushing built containers to docker hub"
    docker login
    docker push arkisto/workspace-api:latest
    docker push arkisto/workspace-api:${VERSION}
    docker push arkisto/workspace-task-runner:latest
    docker push arkisto/workspace-task-runner:${VERSION}
    docker push arkisto/workspace-ui:latest
    docker push arkisto/workspace-ui:${VERSION}
fi