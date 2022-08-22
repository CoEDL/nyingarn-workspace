<xsl:transform version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
	xmlns:csv="https://datatracker.ietf.org/doc/html/rfc4180" 
	xmlns:map="http://www.w3.org/2005/xpath-functions/map"
	xmlns="http://www.tei-c.org/ns/1.0">
	
	<xsl:output method="text" encoding="UTF-8"/>
	
	<!-- CSV-parsing utility library -->
	<xsl:import href="csv.xsl"/>
	<!-- lorem-ipsum anonymizer -->
	<xsl:import href="lorem-ipsum.xsl"/>

	<!-- a complete path name to the file "file:///some-folder/{$identifier}/{$identifier}-tei.csv" -->
	<xsl:param name="source-uri"/>
	
	<xsl:template name="xsl:initial-template">

		<!-- read the CSV file as text -->
		<xsl:variable name="text" select="unparsed-text($source-uri)"/>
		
		<!-- Read the column headings from the first line of the CSV file -->
		<xsl:variable name="column-headings" select="csv:get-header-cells($text)"/>

		<!-- parse the CSV to produce a sequence of maps, each representing one page -->
		<xsl:variable name="rows" select="csv:parse($text)"/>
		
		<!-- output the column heading row -->
		<xsl:value-of select="
			string-join(
				for $heading in $column-headings return csv:escape($heading),
				','
			)
		"/>
		<xsl:call-template name="new-line"/>
		
		<!-- process each row -->
		<xsl:for-each select="$rows">
			<xsl:variable name="row" select="."/>
			<xsl:variable name="row-number" select="position()"/>
			<xsl:variable name="row-id" select="$row('externalIdentifier')"/>
			<xsl:for-each select="$column-headings">
				<xsl:variable name="column-heading" select="."/>
				<xsl:variable name="cell" select="$row($column-heading)"/>
				<xsl:choose>
					<xsl:when test="$column-heading = 'occurrenceRemarks'">
						<!-- the occurrenceRemarks column contains the transcription -->
						<xsl:variable name="anonymized-text">
							<xsl:try>
								<!-- parse the page content as XML -->
								<xsl:variable name="page-content-xml" select="
									$cell 
										=> replace('&amp;', '&amp;amp;')
										=> parse-xml-fragment()
								"/>
								<!-- anonymize the digivol-sourced markup to standard TEI -->
								<xsl:apply-templates mode="lorem-ipsum" select="$page-content-xml"/>
								
								<!-- if parsing the text as XML failed, just escape all the would-be XML markup, and parse that -->
								<xsl:catch>
									<xsl:message select=" 'error parsing row ' || $row-number || ' (' || $row-id || ') as XML - it will be treated as text.' "/>
									<xsl:variable name="page-content-xml" select="
										$cell 
											=> replace('&amp;', '&amp;amp;')
											=> replace('&lt;', '&amp;lt;') 
											=> replace('&gt;', '&amp;gt;')
											=> parse-xml-fragment()
									"/>
									<xsl:apply-templates mode="lorem-ipsum" select="$page-content-xml"/>
								</xsl:catch>
							</xsl:try>
						</xsl:variable>
						<xsl:sequence select="$anonymized-text => serialize() => csv:escape()"/>
					</xsl:when>
					<xsl:otherwise>
						<!-- other columns don't need to be anonymized -->
						<xsl:sequence select="csv:escape($cell)"/>
					</xsl:otherwise>
				</xsl:choose>
				<xsl:if test="position() &lt; last()">,</xsl:if>
			</xsl:for-each>
			<xsl:call-template name="new-line"/>
		</xsl:for-each>

	</xsl:template>
	
	<xsl:template name="new-line">
		<!-- NB the CSV spec says that lines end in CRLF, but DIgivol uses just LF, so we do too -->
		<xsl:value-of select="codepoints-to-string(10)"/>
	</xsl:template>
</xsl:transform>