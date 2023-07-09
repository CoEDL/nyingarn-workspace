<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:nyingarn="https://nyingarn.net/ns/functions">

	<!-- Throw an error back to the calling JS -->
	<!-- NB the error-object is constrained to be a map, and must contain no sequences
	with cardinality greater than 1 -->
	<xsl:function name="nyingarn:error">
		<xsl:param name="code"/>
		<xsl:param name="description"/>
		<xsl:param name="error-object" as="map(*)"/>
<!--
		<xsl:sequence select="
			error(
				QName('https://nyingarn.net/ns/errors', $code),
				$description,
				$error-object => serialize(map{'method': 'json', 'indent': true()})
			)
		"/>
-->
	</xsl:function>
	<xsl:function name="nyingarn:error">
		<xsl:param name="code"/>
		<xsl:param name="description"/>
		<xsl:sequence select="nyingarn:error($code, $description, map{} (: empty map of error properties :))"/>
	</xsl:function>
	
</xsl:transform>
