<xsl:transform version="3.0"	xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:test="test">
	<!--
	Test of weird SaxonJS regression
	-->
	<xsl:param name="source-uri"/>

	<!-- describe the type of an item -->
	<xsl:function name="test:types">
		<xsl:param name="item"/>
		<xsl:sequence select="
			(
				'item()*' [$item instance of item()*],
				'function(*)*' [$item instance of function(*)*],
				'node()*' [$item instance of node()*],
				'text()*' [$item instance of text()*],
				'processing-instruction()*' [$item instance of processing-instruction()*],
				'comment()*' [$item instance of comment()*],
				'namespace-node()*' [$item instance of namespace-node()*],
				'document-node()*' [$item instance of document-node()*],
				'map(*)*' [$item instance of map(*)*],
				'array(*)*' [$item instance of array(*)*]
			)
			=> string-join(', ')
		"/>
	</xsl:function>

	<xsl:template name="xsl:initial-template" expand-text="yes">
		<!-- read the document -->
		<!--<xsl:variable name="source" select="doc($source-uri)"/>-->
		<!-- write the document -->
		<xsl:result-document href="/tmp/regression-test-output.xml" method="xml" indent="no">
			<!-- log the types of the $source variable -->
			<xsl:comment>URI of $source: {$source-uri}</xsl:comment>
			<!--
			<xsl:comment>types of $source: {test:types($source)}</xsl:comment>
			<xsl:comment>string value of $source: {string($source)}</xsl:comment>
			<xsl:copy-of select="$source"/>
			-->
		</xsl:result-document>
	</xsl:template>
	
</xsl:transform>