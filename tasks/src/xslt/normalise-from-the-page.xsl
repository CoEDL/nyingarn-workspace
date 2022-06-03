<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
>
    <!--
	Normalise a "from the page" TEI file into a standard TEI file

	The input document has a conventional structure with <div> elements whose first child is a
	<fw> element containing a page identifier.

	All xml:id attributes are discarded.
	Existing <pb/> elements are discarded and new <pb/> elements created from FTP's <fw> elements.
    -->

    <!-- convert from-the-page's <fw> elements into <pb> with @facs -->
    <xsl:template match="fw" mode="from-the-page">
    	<!-- the identifier is terminated by the first '.' in the value (to discard image file extensions such as .jpg) -->
    	<xsl:variable name="id" select="replace(., '^([^.]+).*', '$1')"/>
    	<!-- get the image file name from the fw value, and guess '.jpg' if no extension present -->
    	<xsl:variable name="image-file" select="if (. => contains('.')) then . else . || '.jpg'"/>
	<pb xml:id="{$id}" facs="{$image-file}"/>
    </xsl:template>

    <!-- discard xml:id attributes -->
    <xsl:template match="@xml:id" mode="from-the-page"/>

    <!-- discard FTP's <pb> elements because their <fw> is our source of truth -->
    <xsl:template match="pb" mode="from-the-page"/>

    <!-- otherwise copy the document unchanged -->
    <xsl:mode name="from-the-page" on-no-match="shallow-copy"/>

    <!-- TODO verify that FTP <div> elements are always spurious -->
    <xsl:template match="div" mode="from-the-page">
	<xsl:apply-templates mode="from-the-page"/>
    </xsl:template>

</xsl:transform>
