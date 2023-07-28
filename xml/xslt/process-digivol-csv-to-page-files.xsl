<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:csv="https://datatracker.ietf.org/doc/html/rfc4180"
	xmlns:c="http://www.w3.org/ns/xproc-step" 
	xmlns:err="http://www.w3.org/2005/xqt-errors"
	xmlns:map="http://www.w3.org/2005/xpath-functions/map"
	xmlns:nyingarn="https://nyingarn.net/ns/functions"
	xmlns="http://www.tei-c.org/ns/1.0">

	<!-- CSV-parsing utility library -->
	<xsl:import href="error.xsl"/>

	<xsl:param name="identifier"/>
	<!-- NB the source document's root element contains a single text node containing JSON resulting from converting a CSV file -->
	<!-- The JSON data is an array of maps, where each item in the array is a row from the CSV,
		and each of the maps in each array item has keys which are the values of the CSV's header row,
		and values which are the correspending data items from that array item's row of the CSV -->
	<!-- a regular expression for validating the identifiers of pages within the tei doc -->
	<xsl:param name="page-identifier-regex"/>



	<!-- Reads a CSV file that's been converted to JSON as an array of maps -->
	<!-- Catches encoding errors and throws a nyingarn friendly error instead -->
	<!-- TODO deal with character encoding errors in the JS layer
	<xsl:function name="csv:json-doc" as="array(map(*))">
		<xsl:param name="href"/>
		<xsl:message>
			csv:json-doc function - href: <xsl:value-of select="$href"/>
		</xsl:message>
		<xsl:try>
			<xsl:sequence select="json-doc($href)"/>
			<xsl:catch errors="err:FOUT1190 err:FOUT1200" select="
				error(
					nyingarn:error-code('character-encoding-error'),
					'Could not decode characters from the file',
					map{
						'code': $err:code,
						'description': $err:description,
						'source-type': 'digivol'
					}
				)
			"/>
		</xsl:try>
	</xsl:function>
	-->

	<xsl:template match="/">
		<xsl:try>
			<!-- read the parsed CSV as a sequence of maps, each representing one page -->
			<xsl:variable name="surfaces" select="parse-json(.)?*"/>
	
			<xsl:variable name="exportable-surfaces" select="
				$surfaces
					[.('externalIdentifier') => starts-with($identifier || '-')] (: the surface's id must start with the id of the item, followed by a hyphen :)
					[.('externalIdentifier') => matches($page-identifier-regex) ]
			"/>
			<xsl:if test="not(exists($exportable-surfaces))">
				<xsl:sequence select="
					error(
						nyingarn:error-code('no-pages-with-suitable-identifiers'),
						'No pages with suitable identifiers',
						map{
							'source-type': 'digivol',
							'document-identifier': $identifier,
							'page-identifier-regex': $page-identifier-regex
						}
					)
				"/>
			</xsl:if>
	
			<c:directory name="{$identifier}">
			<!-- transform each map to a TEI <surface> element and output it in a c:file -->
			<xsl:for-each select="$exportable-surfaces">
				<xsl:variable name="id" select=".('externalIdentifier') => substring-before('.')"/>
				<!-- write the page content to a file named for the @xml:id attribute of the <surface> with no xml declaration or indenting -->
				<c:file name="{$id}.tei.xml">
					<xsl:element name="surface" expand-text="yes">
						<xsl:attribute name="xml:id" select="$id"/>
						<xsl:sequence select="codepoints-to-string(10)"/>
						<!-- occurrenceRemarks column can contain markup: seen in BM1648A91-digivol.csv were <u> and <s>.
						This markup seems to be part of Nyingarn's guidelines for this particular document:
						https://volunteer.ala.org.au//data/volunteer/tutorials/Nyingarn%20BM%20Tutorial2.pdf
						u = underline
						s = strikeout
						unclear
						For now, replace with <u> with <ul> (from TEI Tite) and <s> with the standard TEI <del> element.
						See https://tei-c.org/release/doc/tei-p5-exemplars/html/tei_tite.doc.html#typographical
						-->
	
						<!-- Attempt to parse the page content as a sequence of XML fragments (i.e. parsing any embedded markup). -->
						<!-- If the parse succeeds, transform the result to replace <u> and <s> elements with TEI elements. -->
						<!-- If the parse fails (it may contain badly-formed XML markup, or it may simply contain angle brackets
						not intended as XML markup), then just use the plain text of the page. -->
						<xsl:variable name="lines" select=".('occurrenceRemarks') => replace('&amp;', '&amp;amp;') => tokenize('\r\n|\r|\n')"/>
						<xsl:for-each select="$lines">
							<xsl:element name="line">
								<xsl:try>
									<!-- parse the line as XML -->
									<xsl:variable name="line-content-xml-fragment" select="parse-xml-fragment(.)"/>
									<!-- normalize the digivol-sourced markup to standard TEI -->
									<xsl:apply-templates mode="digivol" select="$line-content-xml-fragment"/>
									<!-- if the parse failed, just use the plain text content -->
									<xsl:catch>
										<xsl:variable name="plain-text">
											<xsl:value-of select="."/>
										</xsl:variable>
										<xsl:apply-templates mode="digivol" select="$plain-text"/>
									</xsl:catch>
								</xsl:try>
							</xsl:element>
							<xsl:sequence select="codepoints-to-string(10)"/>
						</xsl:for-each>
						<xsl:if test="not(map:contains(., 'occurrenceRemarks'))">
							<xsl:message>'occurrenceRemarks' column not found for record '{.('externalIdentifier')}'- no transcription</xsl:message>
						</xsl:if>
					</xsl:element>
					<xsl:sequence select="codepoints-to-string(10)"/>
				</c:file>
			</xsl:for-each>
			</c:directory>
			<xsl:catch>
				<!-- Return any error as a JSON-XML version of a JSON object -->
				<!-- The web service layer which invokes this stylesheet will recognise this JSON-XML response
				as an error, convert it to JSON, and return it to the client as the body of an HTTP 400 response -->
				<!-- the JSON will then be deserialized by the JavaScript client and rethrown as an error. -->
				<xsl:sequence select="
					nyingarn:error-to-json-xml(
						$err:code,
						$err:description,
						$err:value,
						$err:module,
						$err:line-number,
						$err:column-number
					)
				"/>
			</xsl:catch>
		</xsl:try>
	</xsl:template>

	<!-- a <u> element corresponds to an underlined highlight element -->
	<xsl:template mode="digivol" match="u">
		<xsl:element name="hi">
			<xsl:attribute name="rend">underline</xsl:attribute>
			<xsl:apply-templates mode="digivol"/>
		</xsl:element>
	</xsl:template>

	<!-- an <s> (strikethrough) element corresponds to a TEI <del> (deletion) element -->
	<xsl:template mode="digivol" match="s">
		<xsl:element name="del">
			<xsl:apply-templates mode="digivol"/>
		</xsl:element>
	</xsl:template>

	<!-- other element markup should be removed but logged -->
	<xsl:template mode="digivol" match="*" expand-text="yes">
		<!-- found some other element! -->
		<xsl:variable name="unrecognised-element-name" select="local-name()"/>
		<xsl:variable name="unrecognised-elements" select="//*[local-name() = $unrecognised-element-name]"/>
		<!-- log an unrecognised element the first time it is seen -->
		<xsl:if test=". eq $unrecognised-elements[1]">
			<xsl:message>Unrecognised XML element &lt;{$unrecognised-element-name}&gt;. Number of times found: {count($unrecognised-elements)}.</xsl:message>
		</xsl:if>
		<!-- include the content of the unrecognised element -->
		<xsl:apply-templates mode="digivol"/>
	</xsl:template>

	<!-- add line breaks at the end of each line -->
	<!-- TODO wrap lines in <line> instead -->
	<!-- see NewNorcia38-digivol.csv "[Page] 5" where end of lines are not recognised. Are they in fact not "\n" at all? maybe "\r"? or "[\r\n]"-->
	<xsl:template mode="digivol" match="text()">
		<xsl:analyze-string regex="\n" select=".">
			<xsl:matching-substring>
				<xsl:element name="lb"/>
				<xsl:sequence select="codepoints-to-string(10)"/>
			</xsl:matching-substring>
			<xsl:non-matching-substring>
				<xsl:sequence select="."/>
			</xsl:non-matching-substring>
		</xsl:analyze-string>
	</xsl:template>

</xsl:transform>