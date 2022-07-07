<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="3.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:import href="normalise.xsl"/>

    <xsl:template name="xsl:initial-template">
	<xsl:param name="source-uri"/>
	<xsl:variable name="original" select="document($source-uri)"/>
	<xsl:variable name="normalised-original">
	    <xsl:apply-templates select="$original" mode="normalise"/>
	</xsl:variable>
	<xsl:result-document href="final.xml">
	    <xsl:apply-templates select="$normalised-original" mode="reconstitute">
		<xsl:with-param name="source-uri" select="$source-uri" tunnel="yes"/>
	    </xsl:apply-templates>
	</xsl:result-document>
    </xsl:template>
    
    <xsl:mode name="reconstitute" on-no-match="shallow-copy"/>

    <xsl:template match="text" mode="reconstitute">
	<!-- replace the content of the text with content drawn from the various fragment files and stitched together -->
	<xsl:param name="source-uri" tunnel="yes"/>
	<xsl:variable name="fragment-identifiers" select=".//pb/@xml:id"/>
	<xsl:variable name="surface-docs">
	    <xsl:for-each select="$fragment-identifiers">
		<xsl:sequence select="(. => concat('.tei.xml') => resolve-uri($source-uri) => document())"/>
	    </xsl:for-each>
	</xsl:variable>
	<xsl:copy>
		<body>
			<xsl:apply-templates mode="reconstitute" select="$surface-docs/surface/node()"/>
		</body>
	</xsl:copy>
    </xsl:template>
    
</xsl:stylesheet>
