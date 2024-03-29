#!/bin/sh
# compiles the main process-tei.xsl into SaxonJS's JSON-based executable format
SOURCE_DIR=/srv/tasks/src/xslt
for stylesheet in $SOURCE_DIR/*.xsl; do
    node /srv/tasks/node_modules/xslt3 -t -xsl:"$stylesheet" -export:"$stylesheet.sef.json" -nogo
done