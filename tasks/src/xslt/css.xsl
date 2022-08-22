<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:css="https://www.w3.org/Style/CSS/"
    xmlns:map="http://www.w3.org/2005/xpath-functions/map"
    xmlns:array="http://www.w3.org/2005/xpath-functions/array"
>
	<!-- parses a CSS declaration block and returns it as an XDM map mapping property names to value strings -->
    <xsl:function name="css:parse-declaration-block" as="map(*)*">
    	<xsl:param name="declaration-block"/>
    	<xsl:sequence select="
		for $declaration in $declaration-block => tokenize(';') return map:entry(
			$declaration => substring-before(':') => normalize-space(),
			$declaration => substring-after(':') => normalize-space()
		)
    	"/>
    </xsl:function>
</xsl:transform>