<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:css="https://www.w3.org/Style/CSS/"
	xmlns:map="http://www.w3.org/2005/xpath-functions/map"
	xpath-default-namespace="http://www.tei-c.org/ns/1.0"
	xmlns="http://www.tei-c.org/ns/1.0"
>
    <!--
	Normalise a TEI file produced from a DOCX file using OxGarage into a standard TEI file

	Features of the DOCX/OxGarage source document:

	The <p> elements will have rend attributes we can mostly discard (TODO discuss, with examples).
	Page identifiers are encoded as highlighted text with the character style 'Page'.

	OxGarage does not insert any newline characters in the TEI.
    -->
    <!-- CSS declaration parsing -->
    <xsl:import href="css.xsl"/>

	<!-- 
	Of the typographical information which MSWord and OxGarage save in the form of 
	@rend tokens, these are the only ones we've identified as desirable:
	--> 
	<xsl:variable name="desired-rend-tokens" select="('underline', 'strikethrough')"/>

    <!-- copy the document unchanged except as overridden below -->
    <xsl:mode name="docx-via-oxgarage" on-no-match="shallow-copy"/>
    
    <!-- convert the image file identifier from the hi[@rend='Page'] to a pb -->
    <xsl:template match="hi[@rend='Page']" mode="docx-via-oxgarage">
    	<!-- the identifier is terminated by the first '.' in the value (to discard image file extensions such as .jpg) -->
	<pb xml:id="{replace(., '^([^.]+).*', '$1')}"/>
    </xsl:template>
    
    <!-- a paragraph containing nothing but a page break indicator can be ignored, though the page-break should be processed -->
    <!-- meaning the resulting pb element appears without a p wrapper element. -->
    <xsl:template match="
    	p[
    		empty(
    			node()[normalize-space()] except hi[@rend='Page']
    		)
    	]
    " mode="docx-via-oxgarage">
    	<xsl:apply-templates mode="docx-via-oxgarage"/>
    </xsl:template>

    <xsl:template match="@xml:space[.='preserve']" mode="docx-via-oxgarage"/>

    <!-- insert newline characters before each block element for improved readability -->
    <xsl:template match="div | head | p | item | label | note" mode="docx-via-oxgarage">
	<xsl:value-of select="codepoints-to-string(10) (: newline character :)"/>
	<xsl:next-match/>
    </xsl:template>

    <!-- deal with typographical information expressed as rend attributes --> 
    <xsl:template match="@rend" mode="docx-via-oxgarage">
    	<!-- parse the list of tokens in the rend attribute and filter out unwanted tokens -->
    	<xsl:variable name="rend" select="
    		. 
    		=> tokenize()
    		=> filter(
    			function($token) {
    				$token = $desired-rend-tokens
    			} 
    		)
    		=> string-join(' ')
    	"/>
    	<xsl:if test="$rend"><!-- some tokens were found to be worth keeping -->
    		<xsl:attribute name="rend" select="$rend"/>
    	</xsl:if>
    </xsl:template>

    <!-- Deal with inline CSS styles -->
    <!-- Some styling needs to be retained, but other styles can go -->
    <xsl:template match="@style" mode="docx-via-oxgarage">
    	<xsl:variable name="style" select="css:purify-declaration-block(.)"/>
    	<xsl:if test="$style">
    		<xsl:attribute name="style" select="$style"/>
    	</xsl:if>
    </xsl:template>
    
    <xsl:function name="css:purify-declaration-block">
    	<xsl:param name="declaration-block"/>
    	<xsl:variable name="declarations" select="css:parse-declaration-block($declaration-block)"/>
    	<!-- OxGarage can sometimes output bogus "text-align: left" declarations, including along with "text-align: right" -->
    	<!-- which we DO want to keep, so here we discard all "text-align: left", and "text-align: justify" declarations -->
    	<xsl:variable name="non-bogus-declarations" select="$declarations[not(.('text-align') = ('left', 'justify'))]"/>
    	<!-- now filter out unwanted properties -->
    	<xsl:variable name="desired-properties" select="('color', 'text-align')"/>
    	<xsl:sequence select="
    		$non-bogus-declarations
    		=> map:merge() (: merge all the declarations into a single map :)
    		=> map:for-each( (: serialize each declaration if its property is one we want to keep :)
    			function($key, $value) {
    				if ($key = $desired-properties) then 
    					$key || ':' || $value
    				else 
    					()
    			}
    		)
    		=> string-join('; ') (: join the individual declaration into a full declaration block :)
    	"/>
    </xsl:function>
    
</xsl:transform>
