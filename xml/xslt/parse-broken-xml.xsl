<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:c="http://www.w3.org/ns/xproc-step" 
	xmlns:err="http://www.w3.org/2005/xqt-errors"
	xmlns:fn="http://www.w3.org/2005/xpath-functions"
	xmlns:nyingarn="https://nyingarn.net/ns/functions">
	
	<!-- produces a JSON-XML rendition of the error produced by attempting to parse a c:body containing unparsed XML that's not well-formed -->
	
	<xsl:import href="error.xsl"/>
	
	<xsl:template match="c:body">
		<xsl:variable name="filename" select="@disposition => substring-after('filename=&#34;') => substring-before('&#34;')"/>
		<xsl:try>
			<!-- attempt to parse the broken XML -->
			<xsl:sequence select="parse-xml(.)"/>
			<xsl:catch>
				<!-- Return any error as a JSON-XML version of a JSON object -->
				<!-- The web service layer which invokes this stylesheet will recognise this JSON-XML response
				as an error, convert it to JSON, and return it to the client as the body of an HTTP 400 response -->
				<!-- the JSON will then be deserialized by the JavaScript client and rethrown as an error. -->
				<xsl:sequence select="
					nyingarn:error-to-json-xml(
						$err:code,
						$err:description,
						map{'filename': $filename} (:$err:value:),
						$err:module,
						$err:line-number,
						$err:column-number
					)
				"/>
			</xsl:catch>
		</xsl:try>
	</xsl:template>
	
</xsl:transform>