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
  
  <xsl:variable name="lorem-ipsum-text">
    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor 
    incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis 
    nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. 
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore 
    eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt 
    in culpa qui officia deserunt mollit anim id est laborum.
  </xsl:variable>
  
  <xsl:variable name="lorem-ipsum" select="tokenize($lorem-ipsum-text)"/>
  
  <!-- decide whether a given text node need to be anonymized -->
  <xsl:function name="lorem:needed">
  	<xsl:param name="text-node"/>
  	<xsl:sequence select="
  		$text-node
  			[not(ancestor::fw)] (: leave fw, which is significant in FromThePage files :)
  			[not(ancestor::*/@rend='Page')] (: leave 'Page' formatting which is significant in files from Word/OxGarage :)
  			[matches(., '\w')] (: only anonymize text which contains alphabetic chars; page numbers etc don't need it :) 
  			[normalize-space(.)]
  	"/>
  </xsl:function>
  
  <xsl:accumulator name="word-index" initial-value="1">
    <xsl:accumulator-rule match="div | p" select="1"/>
    <xsl:accumulator-rule phase="end" match="text()[lorem:needed(.)]" select="($value + count(tokenize(.))) mod count($lorem-ipsum)"/>
  </xsl:accumulator>
  
  <xsl:template match="text//text()[lorem:needed(.)]">
    <xsl:sequence select="
      let 
        $next-word-index:= accumulator-before('word-index'),
        $number-of-words:= count(tokenize(.))
      return
        $lorem-ipsum 
          => subsequence($next-word-index, $number-of-words)
          => string-join(' ')
    "/>
  </xsl:template>
  
</xsl:stylesheet>