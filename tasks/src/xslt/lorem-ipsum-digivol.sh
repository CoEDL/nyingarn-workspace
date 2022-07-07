#!/bin/sh
# Runs the lorem-ipsum.xsl stylesheet to anonymize a sample digivol CSV file.
# The stylesheet replaces the actual text of the document with the conventional Latin boilerplate text,
# while retaining the markup unchanged. 
if [ $# -ne 1 ] ; then
    echo "Usage: $0 my-digivol-file.csv"
    echo "The new CSV file will be created with a suffix '.new.csv'; check it before over-writing the original"
else
    CSV=$(realpath "$1")
    # digivol CSV files use the Windows-1252 encoding and need to be re-encoded in UTF-8 for Saxon's benefit
    iconv --from-code=WINDOWS-1252 --to-code=UTF-8 "$CSV" --output="$CSV.utf8"
    # apply the anonymizer stylesheet
    node /srv/tasks/node_modules/xslt3 -it -t -xsl:"/srv/tasks/src/xslt/lorem-ipsum-digivol.xsl" -o:"$CSV.utf8.new" source-uri="$CSV.utf8" 
    # Saxon's output file is in UTF-8 and needs to be re-encoded as Windows-1252 to be like a digivol file
    iconv --from-code=UTF-8 --to-code=WINDOWS-1252 "$CSV.utf8.new" --output="$CSV.new.csv"
    # delete temporary files
    rm "$CSV.utf8"
    rm "$CSV.utf8.new"
fi
