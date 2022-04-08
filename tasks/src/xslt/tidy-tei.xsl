<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
>
    <!--
	Tidies up a TEI file.
	This is generic processing applicable to TEI files from any source.

	Trims white space appearing before <lb/> elements.
	Trims white space from the start of each line.
    -->

    <!-- discard leading white space after a line break -->
    <xsl:template match="text()[contains(., codepoints-to-string(10))]" mode="tidy">
	<xsl:sequence select="replace(., '\n\s+', codepoints-to-string(10))"/>
    </xsl:template>

    <!-- trim white space before <lb/> elements -->
    <xsl:template match="text()[following-sibling::*[1]/self::lb][matches(., '\s$')]" mode="tidy">
	<xsl:sequence select="replace(., '\s+$', '')"/>
    </xsl:template>

    <!-- add newline after <lb/> elements -->
    <xsl:template match="lb" mode="tidy">
	<xsl:next-match/>
	<xsl:sequence select="codepoints-to-string(10)"/>
    </xsl:template>

    <!-- trim trailing white space inside <p> elements -->
    <xsl:template match="p/text()[not(following-sibling::node())][matches(., '\s$')]" mode="tidy">
	<xsl:sequence select="replace(., '\s+$', '')"/>
    </xsl:template>

    <xsl:mode name="tidy" on-no-match="shallow-copy"/>

</xsl:transform>
