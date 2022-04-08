<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
>
    <!--
	Normalise a TEI file produced from a DOCX file using OxGarage into a standard TEI file

	Features of the DOCX/OxGarage source document:

	The <p> elements will have rend attributes we can mostly discard (TODO discuss, with examples).
	Page identifiers are encoded as highlighted text with the character style 'Page'.

	OxGarage does not insert any newline characters in the TEI.
    -->

    <!-- convert the image file identifier from the hi[@rend='Page'] to a pb -->
    <xsl:template match="hi[@rend='Page']" mode="docx-via-oxgarage">
	<pb xml:id="{.}"/>
    </xsl:template>

    <!-- insert newline characters before each block element for improved readability -->
    <xsl:template match="div | head | p | item | label | note" mode="docx-via-oxgarage">
	<xsl:value-of select="codepoints-to-string(10) (: newline character :)"/>
	<xsl:next-match/>
    </xsl:template>

    <!-- TODO deal with @rend, which may have some limited value (e.g. in the case of 'bold' text) -->
    <!-- delete usage of 'Normal' style -->
    <xsl:template match="p/@rend[.='Normal']" mode="docx-via-oxgarage"/>

    <!-- otherwise copy the document unchanged -->
    <xsl:mode name="docx-via-oxgarage" on-no-match="shallow-copy"/>

</xsl:transform>
