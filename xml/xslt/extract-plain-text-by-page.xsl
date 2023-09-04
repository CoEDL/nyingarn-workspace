<xsl:transform version="3.0" 
	xpath-default-namespace="http://www.tei-c.org/ns/1.0" 
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
	xmlns:nyingarn="https://nyingarn.net/ns/functions" 
	xmlns:err="http://www.w3.org/2005/xqt-errors">
	<!--
	Divides a TEI file into pages and produces an XML representation of a JSON object
	whose keys are page identifiers and whose values are the	plain text content of each page.
    -->
	<xsl:import href="error.xsl"/>
	<xsl:key name="text-by-page-id" match="text()" use="preceding::pb[1]/@xml:id"/>
	<xsl:template match="/">
		<xsl:try>
			<map xmlns="http://www.w3.org/2005/xpath-functions">
				<xsl:for-each select="/TEI/text//pb">
					<string xsl:expand-text="yes" key="{@xml:id}">{key('text-by-page-id', @xml:id) => string-join() => normalize-space()}</string>
				</xsl:for-each>
			</map>
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
</xsl:transform>