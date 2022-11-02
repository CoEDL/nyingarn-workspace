<xsl:transform version="3.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    xmlns:array="http://www.w3.org/2005/xpath-functions/array"
    xmlns:css="https://www.w3.org/Style/CSS/"
>
    <!--
	Infers semantics which are implicit in a TEI file and encodes them explicitly.
	
	This is generic processing applicable to TEI files from any source.
	
	Converts apparent page numbers to <fw>
	Converts centered paragraphs to <label>
	Converts text formatted with a strikethrough into <del>
    -->

    <!-- CSS declaration parsing -->
    <xsl:import href="css.xsl"/>
    
    <!-- recognise struck out text as a deletion -->
    <xsl:template match="hi[contains-token(@rend, 'strikethrough')]" mode="infer-semantics">
    	<xsl:element name="del">
    		<xsl:variable name="remaining-rend-tokens" select="tokenize(@rend)[not(.='strikethrough')] => string-join(' ')"/>
    		<xsl:if test="$remaining-rend-tokens">
    			<xsl:attribute name="rend" select="$remaining-rend-tokens"/>
    		</xsl:if>
    		<xsl:apply-templates mode="infer-semantics"/>
    	</xsl:element>
    </xsl:template>
    
    <!-- 
    Recognise a paragraph as a page number if it:  
    	a) contains digits, and 
    	b) consists entirely of digits and optional punctuation and whitespace, and
    	c) appears at the start of the page
    	d) is aligned right
    -->
    <xsl:template mode="infer-semantics" match="p
    	[matches(., '\p{Nd}+')]
    	[matches(., '^[\s\p{P}\p{Nd}]+$')]
    	[preceding-sibling::*[1]/self::pb]
    	[css:parse-declaration-block(@style)('text-align')='right']
    ">
    	<fw type="page-number"><xsl:apply-templates mode="infer-semantics"/></fw>
    </xsl:template>
    
    <!-- recognise centered text as labels -->
    <xsl:template mode="infer-semantics" match="p[css:parse-declaration-block(@style)('text-align')='center']">
    	<label><xsl:apply-templates mode="infer-semantics"/></label>
    </xsl:template>
    
    <!-- otherwise copy the document unchanged -->
    <xsl:mode name="infer-semantics" on-no-match="shallow-copy"/>

</xsl:transform>
