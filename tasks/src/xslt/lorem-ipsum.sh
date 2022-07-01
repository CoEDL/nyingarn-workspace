#!/bin/sh
# Runs the lorem-ipsum.xsl stylesheet to anonymize a sample TEI XML file.
# The stylesheet replaces the actual text of the document with the conventional Latin boilerplate text,
# while retaining the markup unchanged. 
if [ $# -ne 1 ] ; then
    echo "Usage: $0 my-tei-file.xml"
    echo "The new TEI file will be created with a suffix '.new'; check it before over-writing the original"
else
    node /srv/tasks/node_modules/xslt3 -t -xsl:"/srv/tasks/src/xslt/lorem-ipsum.xsl" -s:"$1" -o:"$1.new"
fi
