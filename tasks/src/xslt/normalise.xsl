<!--
	This stylesheet is the first in the processing pipeline and performs normalisation steps that are
	needed to make a document conform to our general standard for TEI.
	The stylesheet uses metadata in the TEI document to identify the document's source, and applies
	normalisation rules specific to that source.
	If the source of the document can't be determined, the stylesheet returns the document unchanged.
-->

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="3.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    xmlns:nyingarn="https://nyingarn.net/ns/functions"
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:import href="normalise-from-the-page.xsl"/>
    <xsl:import href="normalise-transkribus.xsl"/>
    <xsl:import href="normalise-docx-via-oxgarage.xsl"/>
    
    <!-- Identify the source application which produced the TEI file -->
    <!-- This is needed so that in the event of an error we can direct users to online help that's specific to that source -->
    <xsl:function name="nyingarn:tei-source-type">
    	<xsl:param name="document"/>
	<xsl:choose>
	    <xsl:when test="$document/TEI/teiHeader/fileDesc/publicationStmt/publisher => contains('FromThePage')">
		<!-- a "from the page" TEI file -->
		<xsl:sequence select=" 'from-the-page' "/>
	    </xsl:when>
	    <xsl:when test="
	    	$document/TEI/teiHeader/fileDesc/publicationStmt/publisher => contains('tranScriptorium') or
	    	$document/TEI/teiHeader/fileDesc/sourceDesc/bibl/idno/@type='Transkribus'
	    ">
		<!-- a "Transkribus" TEI file -->
		<xsl:sequence select=" 'transkribus' "/>
	    </xsl:when>
	    <xsl:when test="$document/TEI/teiHeader/encodingDesc/appInfo/application/@ident = 'TEI_fromDOCX'">
		<!-- a "DOCX via OxGarage" TEI file -->
		<xsl:apply-templates select=" 'docx-via-oxgarage' "/>
	    </xsl:when>
	    <xsl:otherwise>
		<!-- some other kind of TEI file -->
		<xsl:sequence select=" 'generic-tei' "/>
	    </xsl:otherwise>
	</xsl:choose>
    </xsl:function>

    <xsl:template match="/" mode="normalise">
    	<xsl:variable name="source-type" select="nyingarn:tei-source-type(.)"/>
	<xsl:choose>
	    <xsl:when test="$source-type = 'from-the-page' ">
		<!-- normalise a "from the page" file -->
		<xsl:apply-templates mode="from-the-page" select="."/>
	    </xsl:when>
	    <xsl:when test="$source-type = 'transkribus' ">
		<!-- normalise a "Transkribus" file -->
		<xsl:apply-templates mode="transkribus" select="."/>
	    </xsl:when>
	    <xsl:when test="$source-type = 'docx-via-oxgarage' ">
		<!-- normalise a "DOCX via OxGarage" file -->
		<xsl:apply-templates mode="docx-via-oxgarage" select="."/>
	    </xsl:when>
	    <xsl:otherwise>
		<!-- no normalisation needed -->
		<xsl:sequence select="."/>
	    </xsl:otherwise>
	</xsl:choose>
    </xsl:template>

</xsl:stylesheet>
