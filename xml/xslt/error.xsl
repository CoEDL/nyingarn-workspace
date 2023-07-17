<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns:fn="http://www.w3.org/2005/xpath-functions"
	xmlns:nyingarn="https://nyingarn.net/ns/functions">

	<!-- convert a locally named error code into a nyingarn error-code QName -->
	<xsl:function name="nyingarn:error-code">
		<xsl:param name="code"/>
		<xsl:sequence select="QName('https://nyingarn.net/ns/errors', $code)"/>
	</xsl:function>
	
	<xsl:function name="nyingarn:error-to-json-xml">
		<!-- produces a JSON-XML representation of an error, which will later be converted to JSON, and
		later again, deserialized as a JavaScript object by JavaScript code, and thrown as an error -->
		<!-- The error code -->
		<xsl:param name="code" as="xs:QName"/>
		<!-- A description of the error condition; an empty sequence if no description is available (for example, 
		if the errorFO30 function was called with one argument).-->
		<xsl:param name="description" as="xs:string?"/>
		<!-- Value associated with the error. For an error raised by calling the errorFO30 function, this is the 
		value of the third argument (if supplied). For an error raised by evaluating xsl:message with terminate="yes", 
		or a failing xsl:assert, this is the document node at the root of the tree containing the XML message body. -->
		<xsl:param name="value" as="item()*"/>
		<!-- The URI (or system ID) of the stylesheet module containing the instruction where the error occurred; 
		an empty sequence if the information is not available. -->
		<xsl:param name="module" as="xs:string?"/>
		<!-- The line number within the stylesheet module of the instruction where the error occurred; an empty 
		sequence if the information is not available. The value may be approximate. -->
		<xsl:param name="line-number" as="xs:integer?"/>
		<!-- The column number within the stylesheet module of the instruction where the error occurred; an 
		empty sequence if the information is not available. The value may be approximate. -->
		<xsl:param name="column-number" as="xs:integer?"/>
		<fn:map xsl:expand-text="yes">
			<fn:string key="code" xsl:expand-text="no"><xsl:text>Q{</xsl:text>
				<xsl:value-of select="namespace-uri-from-QName($code)"/>
				<xsl:text>}</xsl:text>
				<xsl:value-of select="local-name-from-QName($code)"/></fn:string>
			<fn:string key="message">{$description}</fn:string>
			<xsl:for-each select="$module">
				<!-- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/fileName -->
				<fn:string key="fileName">{.}</fn:string>
			</xsl:for-each>
			<xsl:for-each select="$line-number">
				<!-- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/lineNumber -->
				<fn:number key="lineNumber">{.}</fn:number>
			</xsl:for-each>
			<xsl:for-each select="$column-number">
				<!-- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/columnNumber -->
				<fn:number key="columnNumber">{.}</fn:number>
			</xsl:for-each>
			<xsl:if test="$value instance of map(*)">
				<!-- NB assuming the "value" parameter is always a map; ignored otherwise -->
				<fn:map key="cause">
					<xsl:sequence select="($value => serialize(map{'method': 'json'}) => json-to-xml())/fn:map/*"/>
				</fn:map>
			</xsl:if>
		</fn:map>
	</xsl:function>
	
</xsl:transform>
