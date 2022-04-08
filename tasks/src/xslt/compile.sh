#!/bin/sh
# compiles the main process-tei.xsl into SaxonJS's JSON-based executable format
for stylesheet in /srv/tasks/src/xslt/*.xsl; do
    node /srv/tasks/node_modules/xslt3 -t -xsl:"$stylesheet" -export:"$stylesheet.sef.json" -nogo
done
