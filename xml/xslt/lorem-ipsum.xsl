<?xml version="1.0" encoding="utf-8"?>
<!--
This stylesheet is used to anonymize a TEI document intended to be used as
data for a test case. The effect is to replace the text of the document with
placeholder text <https://en.wikipedia.org/wiki/Lorem_ipsum> while retaining
the markup and certain significant parts of the text.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0" exclude-result-prefixes="#all" expand-text="yes" xpath-default-namespace="http://www.tei-c.org/ns/1.0" 
  xmlns:lorem="https://en.wikipedia.org/wiki/Lorem_ipsum" xmlns:fn="http://www.w3.org/2005/xpath-functions">

	<xsl:mode name="lorem-ipsum" on-no-match="shallow-copy"/>

	<xsl:variable name="lorem-ipsum-text">
		Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor 
		incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis 
		nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat 
		Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
		eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident sunt 
		in culpa qui officia deserunt mollit anim id est laborum.
	</xsl:variable>

	<xsl:variable name="lorem-ipsum" select="tokenize($lorem-ipsum-text)"/>
	<xsl:variable name="count-of-lorem-ipsum-words" select="count($lorem-ipsum)"/>

	<xsl:accumulator name="word-offset" initial-value="1">
		<xsl:accumulator-rule match="div | p | table" select="1"/>
		<xsl:accumulator-rule phase="end" match="text()" select="($value + count(tokenize(.))) mod $count-of-lorem-ipsum-words"/>
	</xsl:accumulator>
	
	<xsl:function name="lorem:word">
		<xsl:param name="offset"/>
		<xsl:sequence select="$lorem-ipsum[$offset mod $count-of-lorem-ipsum-words]"/>
	</xsl:function>

	<xsl:template match="text()[normalize-space()]" mode="lorem-ipsum">
		<xsl:variable name="words" select="replace(., '^\s*(.+?)\s*$', '$1')"/>
		<xsl:variable name="offset" select="accumulator-before('word-offset')"/>
		<xsl:variable name="words-and-spaces" select="analyze-string(., '[\p{L}]+')"/><!-- letters only (don't obfuscate numerals) -->
		<xsl:sequence select="
			string-join(
				for $token in $words-and-spaces/* return
					if ($token/self::fn:non-match) then
						$token
					else
						lorem:word($offset + count($token/preceding-sibling::fn:match))
			)
		"/>		
	</xsl:template>
	
</xsl:stylesheet>
