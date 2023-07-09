<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    xmlns:array="http://www.w3.org/2005/xpath-functions/array"
>
    <!--
	Tidies up a TEI file.
	This is generic processing applicable to TEI files from any source.

	Trims white space appearing before <lb/> elements.
	Trims white space from the start of each line.
	Discards <hi> elements with no @rend
    -->
    
    <!-- remove whitespace chars that either:
        • immediately follow a newline character
        • immediately precede a newline chararacter
        • immediately precede an lb element
    -->
    <xsl:template match="text()" mode="tidy">
    	<xsl:variable name="without-leading-whitespace" select="replace(., '\n\s+', codepoints-to-string(10))"/>
    	<xsl:variable name="without-trailing-whitespace" select="
    		if (
    			(parent::p and not(following-sibling::*)) or (: last text node in a p :)
    			(following-sibling::*[1]/self::lb) (: immediately followed by a lb :)
    		) then 
    			replace($without-leading-whitespace, '\s+$', '')
    		else
    			$without-leading-whitespace
    	"/>
    	<xsl:sequence select="$without-trailing-whitespace"/>
    </xsl:template>

    <!-- add newline after <lb/> elements -->
    <xsl:template match="lb" mode="tidy">
	<xsl:next-match/>
	<xsl:sequence select="codepoints-to-string(10)"/>
    </xsl:template>
    
    <!-- discard highlight elements where the nature of the highlight is missing (has been stripped out in a prior step -->
    <xsl:template match="hi[not(@rend or @style)]" mode="tidy">
    	<xsl:apply-templates mode="tidy"/>
    </xsl:template>
        
    <xsl:template match="seg[not(@*)]" mode="tidy">
    	<xsl:apply-templates mode="tidy"/>
    </xsl:template>
    
    <xsl:template match="@xml:space[.='preserve']" mode="tidy"/>
    
    <!-- merge sequences of adjacent hi elements with the same @rend and @style values -->
    <!-- which can occur when adjacent hi elements originally had different @rend, but -->
    <!-- a pruning of @rend tokens has left them the same -->
    <xsl:template match="*" mode="tidy">
    	<xsl:copy>
    		<xsl:apply-templates select="@*" mode="tidy"/>
    		<xsl:choose>
    			<xsl:when test="hi">
    				<xsl:call-template name="merge-adjacent-identical-highlights"/>
    			</xsl:when>
    			<xsl:otherwise>
    				<xsl:apply-templates mode="tidy"/>
    			</xsl:otherwise>
    		</xsl:choose>
    	</xsl:copy>
    </xsl:template>
    
    <xsl:template name="merge-adjacent-identical-highlights">
	<xsl:for-each-group select="node()" composite="yes" group-adjacent="
		(: construct a stable grouping key by tokenizing @rend and @style and sorting the tokens :)
		array:sort(
			array{
				(
					self::hi/@rend => tokenize(),
					self::hi/@style => tokenize('\s*;\s*')
				)
			}
		)">
		<xsl:choose>
			<xsl:when test="self::hi">
				<!-- a group of hi elements which all have the same rendition and style -->
				<!-- TODO what about if adjacent hi elements have other attributes, eg. xml:id? -->
				<xsl:variable name="content">
					<xsl:apply-templates mode="tidy" select="current-group()/node()"/>
				</xsl:variable>
				<xsl:choose>
					<xsl:when test="@rend or @style">
						<!-- the highlight has some kind of formatting attached, so retain the element -->
						<xsl:copy>
							<xsl:apply-templates mode="tidy" select="@*"/>
							<xsl:sequence select="$content"/>
						</xsl:copy>
						</xsl:when>
						<xsl:otherwise>
							<!-- the highlight has no formatting attached, so discard it, leaving its content -->
							<xsl:sequence select="$content"/>
						</xsl:otherwise>
					</xsl:choose>
				</xsl:when>
				<xsl:otherwise>
					<!-- a disparate group of non-highlight elements -->
					<xsl:apply-templates mode="tidy" select="current-group()"/>
				</xsl:otherwise>
			</xsl:choose>
		</xsl:for-each-group>
	</xsl:template>

    <!-- otherwise copy the document unchanged -->
    <xsl:mode name="tidy" on-no-match="shallow-copy"/>

</xsl:transform>
