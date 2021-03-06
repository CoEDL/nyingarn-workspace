<xsl:transform version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
	xmlns:csv="https://datatracker.ietf.org/doc/html/rfc4180" 
	xmlns:map="http://www.w3.org/2005/xpath-functions/map"
	xmlns="http://www.tei-c.org/ns/1.0">
	
	<!-- CSV-parsing utility library -->
	<xsl:import href="csv.xsl"/>
	
	<xsl:template name="xsl:initial-template">
		<!-- the identifier of the document in the Nyingarn workspace -->
		<xsl:param name="identifier"/>
		<!-- a complete path name to the file "file:///some-folder/{$identifier}/{$identifier}-tei.csv" -->
		<xsl:param name="source-uri"/>
		<!-- a regular expression for validating the identifiers of pages within the tei doc -->
		<xsl:param name="page-identifier-regex"/>
		
		<!-- parse the CSV to produce a sequence of maps, each representing one page -->
		<xsl:variable name="surfaces" select="csv:doc($source-uri)"/>
		
		<xsl:variable name="exportable-surfaces" select="
			$surfaces
				[.('externalIdentifier') => starts-with($identifier || '-')] (: the surface's id must start with the id of the item, followed by a hyphen :)
				[.('externalIdentifier') => matches($page-identifier-regex) ]
		"/>
		<xsl:if test="not(exists($exportable-surfaces))">
			<xsl:message terminate="true" expand-text="true">ERROR: no pages with suitable identifiers. No pages had an identifier starting with {$identifier} and matching the regular expression "{$page-identifier-regex}".</xsl:message>
		</xsl:if>

		<!-- transform each map to a TEI <surface> element and output it as a file -->
		<xsl:for-each select="$exportable-surfaces">
			<xsl:variable name="id" select=".('externalIdentifier') => substring-before('.')"/>
			<!-- write the page content to a file named for the @xml:id attribute of the <surface> with no xml declaration or indenting -->
			<xsl:result-document href="{$id}.tei.xml" omit-xml-declaration="yes" indent="no">
				<xsl:element name="surface">
					<xsl:attribute name="facs" select=".('externalIdentifier')"/>
					<xsl:attribute name="xml:id" select="$id"/>
					<!-- capture any notes from transcriber and validator as XML comments -->
					<xsl:if test=".('transcriberNotes')[normalize-space()]">
						<xsl:sequence select="codepoints-to-string(10)"/>
						<xsl:comment expand-text="true">{.('transcriberID')} (transcriber): {.('transcriberNotes')}</xsl:comment>
					</xsl:if>
					<xsl:if test=".('validatorNotes')[normalize-space()]">
						<xsl:sequence select="codepoints-to-string(10)"/>
						<xsl:comment expand-text="true">{.('validatorID')} (validator): {.('validatorNotes')}</xsl:comment>
					</xsl:if>
					<!-- TODO other processing? insert <lb/> elements at the end of each line? include data from any other CSV columns? -->
					<!-- occurrenceRemarks column can contain markup: seen in BM1648A91-digivol.csv were <u> and <s>. 
					This markup seems to be part of Nyingarn's guidelines for this particular document: 
					https://volunteer.ala.org.au//data/volunteer/tutorials/Nyingarn%20BM%20Tutorial2.pdf
					u = underline
					s = strikeout
					unclear
					For now, replace with <u> with <ul> (from TEI Tite) and <s> with the standard TEI <del> element.
					See https://tei-c.org/release/doc/tei-p5-exemplars/html/tei_tite.doc.html#typographical
					-->
					<!-- Attempt to parse the page content as an XML fragment (i.e. parsing any embedded markup). -->
					<!-- If the parse succeeds, transform the result to replace <u> and <s> elements with TEI elements. -->
					<!-- If the parse fails (it may contain badly-formed XML markup, or it may simply contain angle brackets 
					not intended as XML markup), then just use the plain text of the page. -->
					
					<!-- normalize the line-endings in the text; CRLF pairs should be reduced to just LF, as is normal in XML text -->
					<xsl:variable name="page-content-plain-text" select=".('occurrenceRemarks') => translate(codepoints-to-string(13), '')"/>
					<xsl:variable name="page-content">
						<xsl:try>
							<!-- parse the page content as XML -->
							<xsl:variable name="page-content-xml-fragment" select="
								.('occurrenceRemarks') => replace('&amp;', '&amp;amp;') => parse-xml-fragment()
							"/>
							<!-- normalize the digivol-sourced markup to standard TEI -->
							<xsl:apply-templates mode="digivol" select="$page-content-xml-fragment"/>
							<!-- if the parse failed, just use the plain text content -->
							<xsl:catch>
								<xsl:apply-templates mode="digivol" select="$page-content-plain-text"/>
							</xsl:catch>
						</xsl:try>
					</xsl:variable>
					<xsl:sequence select="codepoints-to-string(10)"/>
					<xsl:sequence select="$page-content"/>
					<xsl:element name="lb"/>
					<xsl:sequence select="codepoints-to-string(10)"/>
					<xsl:if test="not(map:contains(., 'occurrenceRemarks'))">
						<xsl:message xsl:expand-text="yes">'occurrenceRemarks' column not found for record '{.('externalIdentifier')}'- no transcription</xsl:message>
					</xsl:if>
				</xsl:element>
			</xsl:result-document>
		</xsl:for-each>
	</xsl:template>
	
	<!-- a <u> element corresponds to a TEI Tite <ul> (underline) element -->
	<xsl:template mode="digivol" match="u">
		<xsl:element name="ul"><xsl:apply-templates mode="digivol"/></xsl:element>
	</xsl:template>
	
	<!-- an <s> (strikethrough) element corresponds to a TEI <del> (deletion) element --> 
	<xsl:template mode="digivol" match="s">
		<xsl:element name="del"><xsl:apply-templates mode="digivol"/></xsl:element>
	</xsl:template>
	
	<!-- other element markup should be removed but logged -->
	<xsl:template mode="digivol" match="*">
		<!-- found some other element! -->
		<xsl:variable name="unrecognised-element-name" select="local-name()"/>
		<xsl:variable name="unrecognised-elements" select="//*[local-name() = $unrecognised-element-name]"/>
		<!-- log an unrecognised element the first time it is seen -->
		<xsl:if test=". eq $unrecognised-elements[1]">
			<xsl:message xsl:expand-text="yes">Unrecognised XML element &lt;{$unrecognised-element-name}&gt;. Number of times found: {count($unrecognised-elements)}.</xsl:message>
		</xsl:if>
		<!-- include the content of the unrecognised element -->
		<xsl:apply-templates mode="digivol"/>
	</xsl:template>
	
	<!-- add line breaks at the end of each line -->
	<xsl:template mode="digivol" match="text()">
		<xsl:analyze-string regex="\n" select=".">
			<xsl:matching-substring><xsl:element name="lb"/><xsl:sequence select="codepoints-to-string(10)"/></xsl:matching-substring>
			<xsl:non-matching-substring><xsl:sequence select="."/></xsl:non-matching-substring>
		</xsl:analyze-string>
	</xsl:template>

</xsl:transform>