<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
>
    <!--
	Normalise a Transkribus TEI file into a standard TEI file

	Features of the Transkribus source document:

	The <pb> elements use @xml:id attributes (not @facs) to identify the corresponding page image file.
	The <lb> elements have @facs attributes whose referents are not present in the file, and @n attributes which are pointless.
	Transkribus creates <hi> elements to record some typographical properties, but some of the typographical properties
	recorded are bogus, e.g. fontSize:0.0
    -->

    <!-- trim the file extension from the @xml:id -->
    <xsl:template match="pb" mode="transkribus">
	<pb xml:id="{replace(@xml:id, '(.*)\..+', '$1')}"/>
    </xsl:template>

    <!-- discard lb @facs and @n attributes because they point nowhere and say nothing useful -->
    <xsl:template match="lb/@facs | lb/@n" mode="transkribus"/>

    <!-- deal with hi/@rend, which may have some limited value (e.g. in the case of 'bold' text) -->
    <xsl:template match="hi/@rend" mode="transkribus">
	<xsl:variable name="current-properties" select="tokenize(.)"/>
	<xsl:variable name="unwanted-properties" select="( 'fontSize:0.0;', 'kerning:0;' )"/>
	<xsl:variable name="retained-properties" select="$current-properties[not(.=$unwanted-properties)]"/>
	<xsl:if test="exists($retained-properties)">
		<xsl:attribute name="rend" select="string-join($retained-properties, ' ')"/>
	</xsl:if>
    </xsl:template>

    <!-- otherwise copy the document unchanged -->
    <xsl:mode name="transkribus" on-no-match="shallow-copy"/>

</xsl:transform>
