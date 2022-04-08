<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
>
    <!--
	Processes a "from the page" TEI file into a set of TEI fragments containing one page each.
	The document is first normalised and tidied up.
	Then document is split into a set of files each containing one page of transcript.
    -->
    <xsl:import href="tidy-tei.xsl"/>
    <xsl:import href="paginate.xsl"/>
    <xsl:import href="normalise.xsl"/>

    <xsl:template name="xsl:initial-template">
	<xsl:param name="source-uri"/>
	<xsl:variable name="source" select="document($source-uri)"/>
	<xsl:variable name="normalised">
	    <!-- the normalisation step will convert any source-specific conventions into a standard form of TEI -->
	    <!-- different normalisation will be needed for TEI from different sources -->
	    <xsl:apply-templates mode="normalise" select="$source"/>
	</xsl:variable>
	<!-- tidy up the document -->
	<xsl:variable name="tidied">
	    <xsl:apply-templates select="$normalised" mode="tidy"/>
	</xsl:variable>
	<!-- split the div elements by "bubbling up" any pb elements they contain so that the pb elements are in between div elements rather than within them -->
	<xsl:variable name="bubbled">
	    <xsl:apply-templates select="$tidied" mode="bubble-pagebreaks"/>
	</xsl:variable>
	<!-- paginate the document by creating a facsimile element and populating it with surface elements containing the content which was delimited by a pair of page break elements -->
	<xsl:variable name="paginated">
	    <xsl:apply-templates select="$bubbled" mode="paginate"/>
	</xsl:variable>
	<!-- write the surface elements out as separate files -->
	<xsl:for-each select="$paginated/TEI/sourceDoc/surface[@xml:id]">
	    <!-- write the page content to a file named for the @xml:id attribute of the <surface> with no xml declaration or indenting -->
	    <xsl:result-document href="{@xml:id}.tei.xml" omit-xml-declaration="yes" indent="no">
		<!-- write out the content between the current page break and the next page break -->
		<xsl:apply-templates select="." mode="serialize"/>
	    </xsl:result-document>
	</xsl:for-each>

	<!-- debug -->
	<!--
	<xsl:result-document href="tidied.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$tidied"/>
	</xsl:result-document>
	<xsl:result-document href="bubbled.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$bubbled"/>
	</xsl:result-document>
	<xsl:result-document href="paginated.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$paginated"/>
	</xsl:result-document>
    -->
    </xsl:template>

    <!-- copy any other elements while discarding unused namespace declarations -->
    <xsl:template match="*" mode="serialize">
	<xsl:copy copy-namespaces="no">
	    <xsl:apply-templates select="@*" mode="serialize"/>
	    <xsl:apply-templates select="node()" mode="serialize"/>
	</xsl:copy>
    </xsl:template>

    <!-- copy all attributes -->
    <xsl:template match="@*" mode="serialize">
	<xsl:copy/>
    </xsl:template>

</xsl:transform>
