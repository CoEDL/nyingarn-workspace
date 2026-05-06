#!/usr/bin/env bash

if ./bin/elasticsearch-plugin list | grep -q 'nyingarn-phonetic-search'; then
  echo 'Plugin already installed'
  ./bin/elasticsearch-plugin remove nyingarn-phonetic-search
fi

./bin/elasticsearch-plugin install https://github.com/r-tae/nyingarn-phonetic-search/releases/download/v1.0.0/nyingarn-phonetic-search-1.0-SNAPSHOT.zip

/usr/local/bin/docker-entrypoint.sh "$@"
