#!/usr/bin/env bash

if [ "$#" != "1" ]; then
  echo "Usage: $0 [minor | patch]"

  exit 1
fi

if [[ $1 != 'minor' && $1 != 'patch' ]]; then
  echo "Usage: $0 [minor | patch]"

  exit 1
fi

# version the code
cd api || {
  echo "Failure to find api directrory"
  exit 1
}
version=$(npm version --no-git-tag-version "$1")

cd ../tasks || {
  echo "Failure to find tasks directrory"
  exit 1
}
npm version --no-git-tag-version "${version}"

cd ../ui || {
  echo "Failure to find ui directrory"
  exit 1
}
npm version --no-git-tag-version "$version"

cd ../ui-repository || {
  echo "Failure to find ui-repository directrory"
  exit 1
}
npm version --no-git-tag-version "$version"

cd .. || {
  echo "Failure to return to root directrory"
  exit 1
}

git tag "$version"
git commit -a -m "tag and bump version"

# push it to github to trigger container builds
git push origin master --tags
