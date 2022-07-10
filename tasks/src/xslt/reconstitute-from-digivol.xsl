<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="3.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:import href="normalise.xsl"/>
    <xsl:import href="csv.xsl"/>

    <xsl:template name="xsl:initial-template">
	<xsl:param name="source-uri"/>
	<xsl:param name="identifier"/>
	<xsl:param name="title"/>
	<xsl:param name="publisher"/>
	<xsl:param name="source-description"/>
	<!-- generate an output file name; trim off the extension from the main source file, and append "-final.xml" -->
	<xsl:variable name="output-file-name" select="replace($source-uri, '([^.]+).*', '$1-final.xml')"/>
	<xsl:result-document href="{$output-file-name}">
		<!-- generate a full TEI file from a digivol csv file and the previously generated TEI surface files -->
		<xsl:variable name="csv-rows" select="csv:doc($source-uri)" xmlns:csv="https://datatracker.ietf.org/doc/html/rfc4180"/>
		<!--<xsl:variable name="csv-rows" select="()"/>-->
		<xsl:variable name="relevant-rows" select="
			$csv-rows
				[.('externalIdentifier') => starts-with($identifier || '-')] (: the surfaces we want are those whose identifier starts with the id of the item, followed by a hyphen :)
		"/>
		<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="{$identifier}">
			<teiHeader>
				<fileDesc>
					<titleStmt>
						<title>{$title}</title>
					</titleStmt>
					<publicationStmt>
						<publisher>{$publisher}</publisher>
					</publicationStmt>
					<sourceDesc>
						<bibl>{$source-description}</bibl>
					</sourceDesc>
				</fileDesc>
			</teiHeader>
			<text>
				<body>
					<!-- for each row of the CSV file, insert a page break, followed by the content of the corresponding surface file -->
					<!-- 
						NB the assumption here is that the ex-Digivol <surface> files don't have an internal structure of <div> elements
						broken between <surface> elements, with @part attributes to indicate how to reassemble them, like <surface>
						files generated from an ingested TEI file might. So there's no attempt here to join <div> elements back together;
						instead the contents of the <surface> elements are simply concatenated, with a <pb/> inserted before each one
					-->
					<xsl:for-each select="$relevant-rows">
						<xsl:variable name="row" select="."/>
						<xsl:variable name="surface-id" select="
							.('externalIdentifier') 
							=> substring-before('.') 
						"/>
						<pb xml:id="{$surface-id}" facs="{.('externalIdentifier')}"/>
						<xsl:variable name="surface-doc" select="
							$surface-id
							=> concat('.tei.xml')
							=> resolve-uri($source-uri) 
							=> document()
						"/>
						<xsl:sequence select="$surface-doc/surface/node()"/>
					</xsl:for-each>
				</body>
			</text>
		</TEI>
	</xsl:result-document>
    </xsl:template>
    
</xsl:stylesheet>
