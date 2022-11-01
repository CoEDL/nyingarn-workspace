#!/bin/sh
# compiles the front end XSLT into SaxonJS's JSON-based executable format
for stylesheet in /srv/api/src/common/*.xsl; do
    node /srv/api/node_modules/xslt3 -t -xsl:"$stylesheet" -export:"$stylesheet.sef.json" -nogo
done
