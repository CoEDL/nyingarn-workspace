#!/bin/sh
# Runs the lorem-ipsum.xsl stylesheet to anonymize a sample digivol CSV file.
# The stylesheet replaces the actual text of the document with the conventional Latin boilerplate text,
# while retaining the markup unchanged. 
if [ $# -ne 1 ] ; then
    echo "Usage: $0 my-digivol-file.csv"
    echo "The new CSV file will be created with a suffix '.new.csv'; check it before over-writing the original"
else
    CSV=$(realpath "$1")
    # apply the anonymizer stylesheet
    node /srv/tasks/node_modules/xslt3 -it -xsl:"/srv/tasks/src/xslt/lorem-ipsum-digivol.xsl" -o:"$CSV.new.csv" source-uri="$CSV" 
fi
