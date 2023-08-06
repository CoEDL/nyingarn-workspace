<!-- post-process a schematron validation report -->
<!-- If there are failed assertions, transform the report into a JSON-XML rendition of a JS error object -->
<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:fn="http://www.w3.org/2005/xpath-functions"
	xmlns:svrl="http://purl.oclc.org/dsdl/svrl"
	xmlns:nyingarn="https://nyingarn.net/ns/functions">
	<xsl:import href="error.xsl"/>
	<xsl:template match="svrl:schematron-output">
		<xsl:choose>
			<xsl:when test="//svrl:failed-assert">
				<xsl:variable name="failed-assertions" select="
					map{
						'failed-assertions': string-join(
							for $assert in //svrl:failed-assert return 
								'assertion &quot;' || $assert/@id || '&quot; (' || $assert/svrl:text || ') at location: &quot;' || $assert/@location || '&quot;',
							',&#10;'
						)
					}
				"/>
				<!-- return a JavaScript error encoded in JSON-XML, describing the invalidities -->
				<xsl:sequence select="
					nyingarn:error-to-json-xml(
						nyingarn:error-code('schematron-validation-failed'),
						'The document was not valid according to the schema',
						$failed-assertions,
						(),
						(),
						()
					)
				"/>
			</xsl:when>
			<xsl:otherwise>
				<!-- return the schematron report unchanged -->
				<xsl:sequence select="."/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
</xsl:transform>