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
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:import href="normalise-from-the-page.xsl"/>
    <xsl:import href="normalise-transkribus.xsl"/>
    <xsl:import href="normalise-docx-via-oxgarage.xsl"/>

    <xsl:template match="/" mode="normalise">
	<xsl:choose>
	    <xsl:when test="/TEI/teiHeader/fileDesc/publicationStmt/publisher => contains('FromThePage')">
		<!-- normalise a "from the page" file -->
		<xsl:apply-templates mode="from-the-page" select="."/>
	    </xsl:when>
	    <xsl:when test="/TEI/teiHeader/fileDesc/publicationStmt/publisher => contains('tranScriptorium')">
		<!-- normalise a "Transkribus" file -->
		<xsl:apply-templates mode="transkribus" select="."/>
	    </xsl:when>
	    <xsl:when test="/TEI/teiHeader/encodingDesc/appInfo/application/@ident = 'TEI_fromDOCX'">
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
