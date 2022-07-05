<?xml version="1.0" encoding="utf-8"?>
<!--
This stylesheet is used to anonymize a TEI document intended to be used as
data for a test case. The effect is to replace the text of the document with
placeholder text <https://en.wikipedia.org/wiki/Lorem_ipsum> while retaining
the markup and certain significant parts of the text.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
		version="3.0"
		exclude-result-prefixes="#all"
		expand-text="yes"
		xpath-default-namespace="http://www.tei-c.org/ns/1.0"
		xmlns:lorem="https://en.wikipedia.org/wiki/Lorem_ipsum">

	<xsl:mode on-no-match="shallow-copy"/>
	
	<xsl:import href="lorem-ipsum.xsl"/>
  
	<xsl:template match="text//text()
		[not(ancestor::fw)] (: leave fw, which is significant in FromThePage files :)
		[not(ancestor::*/@rend='Page')] (: leave 'Page' formatting which is significant in files from Word/OxGarage :)
		[matches(., '\w')] (: only anonymize text which contains alphabetic chars; page numbers etc don't need it :) 
		[normalize-space(.)]">
		<xsl:apply-templates select="." mode="lorem-ipsum"/>
	</xsl:template>
  
</xsl:stylesheet>