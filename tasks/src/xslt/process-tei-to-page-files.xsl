<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xpath-default-namespace="http://www.tei-c.org/ns/1.0"
	xmlns:nyingarn="https://nyingarn.net/ns/functions"
	xmlns="http://www.tei-c.org/ns/1.0">
	<!--
	Processes a TEI file into a set of TEI fragments containing one page each.
	The document is first normalised and tidied up.
	Then document is split into a set of files each containing one page of transcript.
    -->
	<xsl:import href="error.xsl"/>
	<xsl:import href="infer-semantics.xsl"/>
	<xsl:import href="tidy-tei.xsl"/>
	<xsl:import href="paginate.xsl"/>
	<xsl:import href="normalise.xsl"/>

	<xsl:template name="xsl:initial-template">
		<xsl:param name="identifier"/>
		<!-- the identifier of the document in the Nyingarn workspace -->
		<xsl:param name="source-uri"/>
		<!-- a complete path name to the file "file:///some-folder/{$identifier}/{$identifier}-tei.xml" -->
		<xsl:param name="page-identifier-regex"/>
		<!-- a regular expression for validating the identifiers of pages within the tei doc -->
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
		<!-- recognise certain formatting and textual patterns in the text and upconvert them to semantic TEI elements -->
		<xsl:variable name="upconverted">
			<xsl:apply-templates select="$tidied" mode="infer-semantics"/>
		</xsl:variable>
		<!-- split the div elements by "bubbling up" any pb elements they contain so that the pb elements are in between div elements rather than within them -->
		<xsl:variable name="bubbled">
			<xsl:apply-templates select="$upconverted" mode="bubble-pagebreaks"/>
		</xsl:variable>
		<!-- paginate the document by creating a facsimile element and populating it with surface elements containing the content which was delimited by a pair of page break elements -->
		<xsl:variable name="paginated">
			<xsl:apply-templates select="$bubbled" mode="paginate"/>
		</xsl:variable>
		<!-- write the surface elements out as separate files -->
		<xsl:variable name="surfaces" select="$paginated/TEI/sourceDoc/surface"/>
		<xsl:if test="not(exists($surfaces))">
			<xsl:sequence select="
				nyingarn:error(
					'unpaginated-document', (: error code :)
					'Unpaginated document', (: stub error message :)
					map{
						'source-type': nyingarn:tei-source-type($source) (: e.g. 'docx-via-oxgarage', 'from-the-page', etc. :)
					}
				)
			"/>
		</xsl:if>
		<!-- exportable surfaces are those whose id matches the document's $identifier with a dash and a numeric suffix -->
		<xsl:variable name="exportable-surfaces" select="
		$surfaces
			[@xml:id => starts-with($identifier || '-')] (: the surface's id must start with the id of the item, followed by a hyphen :)
			[@xml:id => concat('.tei.xml') => matches($page-identifier-regex) ]
		"/>
		<xsl:if test="not(exists($exportable-surfaces))">
			<!-- throw an error -->
			<xsl:sequence select="
				nyingarn:error(
					'no-pages-with-suitable-identifiers',
					'No pages with suitable identifiers',
					map{
						'document-identifier': $identifier,
						'page-identifier-regex': $page-identifier-regex,
						'source-type': nyingarn:tei-source-type($source) (: e.g. 'docx-via-oxgarage', 'from-the-page', etc. :)
					}
				)
			"/>
		</xsl:if>
		<!-- check to ensure that all the surface identifiers are unique -->
		<xsl:variable name="surface-identifiers" select="$exportable-surfaces/@xml:id"/>
		<xsl:variable name="distinct-surface-identifiers" select="distinct-values($surface-identifiers) ! string()"/>
		<xsl:if test="count($distinct-surface-identifiers) != count($surface-identifiers)">
			<xsl:variable name="duplicate-identifiers" select="$distinct-surface-identifiers[count($surface-identifiers[. = $identifier]) != 1]"/>
			<xsl:sequence select="
				nyingarn:error(
					'duplicate-page-identifiers-found',
					'Duplicate page identifiers found',
					map{
						'duplicate-identifiers': $duplicate-identifiers => string-join(', '),
						'source-type': nyingarn:tei-source-type($source) (: e.g. 'docx-via-oxgarage', 'from-the-page', etc. :)
					}
				)
			"/>
		</xsl:if>
		<xsl:for-each select="$exportable-surfaces">
			<!-- write the page content to a file named for the @xml:id attribute of the <surface> with no xml declaration or indenting -->
			<xsl:result-document href="{@xml:id}.tei.xml" omit-xml-declaration="yes" indent="no">
				<!-- write out the content between the current page break and the next page break -->
				<xsl:apply-templates select="." mode="serialize"/>
			</xsl:result-document>
		</xsl:for-each>

		<!-- debug --><!--
	<xsl:result-document href="normalised.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$normalised"/>
	</xsl:result-document>
	<xsl:result-document href="tidied.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$tidied"/>
	</xsl:result-document>
	<xsl:result-document href="upconverted.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$upconverted"/>
	</xsl:result-document>
	<xsl:result-document href="bubbled.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$bubbled"/>
	</xsl:result-document>
	<xsl:result-document href="paginated.xml" omit-xml-declaration="yes" indent="yes">
	    <xsl:sequence select="$paginated"/>
	</xsl:result-document>-->
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
