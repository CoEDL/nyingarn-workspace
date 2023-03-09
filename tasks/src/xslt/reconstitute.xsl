<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="3.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:template name="xsl:initial-template">
	<xsl:param name="files"/><!-- a space-delimited list of names of files from which to reconstitute the TEI document (including the TEI surface files, but also e.g. the ro-crate file) -->
	<xsl:param name="identifier"/><!-- the identifier of the TEI document e.g. "Bates32" -->
	<xsl:param name="page-identifier-regex"/><!-- a regular expression which constrains the names of the fragment files (a valid name would be e.g. "Bates32-01.tei.xml" -->
	<xsl:param name="base-uri"/><!-- base URI of input and output files -->
	
	<xsl:variable name="surface-files" select="
		($files => tokenize() => sort())
			[. => starts-with( $identifier || '-')] (: the surface's id must start with the id of the item, followed by a hyphen :)
			[. => matches($page-identifier-regex)]
	"/>
	
	<!-- a full TEI file will be regenerated from the TEI surface files generated at the time of ingestion into Nyingarn -->
	<xsl:variable name="surfaces" select="$surface-files ! resolve-uri(., $base-uri) ! doc(.) (: parse the surface files :)"/>
	
	
	<xsl:variable name="ro-crate" select=" 'ro-crate-metadata.json' => resolve-uri($base-uri) => json-doc() (: parse the ro-crate json file :)"/>
	<xsl:variable name="ro-crate-properties" select="$ro-crate('@graph')?* (: get all the properties from the @graph array :)"/>
	<xsl:variable name="ro-crate-root-id" select="
		(: find the identifier of the 'root' object in the ro-crate :)
		$ro-crate-properties (: all properties ... :)
			[ (: filtered to include only those properties for which ... :)
				.('conformsTo') (: any conformsTo property value it might have ... :)
				!.('@id') (: has an @id property which starts with the ro-crate URI :) => starts-with('https://w3id.org/ro/crate/')
			]
			!.('about') (: get its 'about' subproperty map :)
			!.('@id') (: get the @id subproperty :)
	"/>
	<xsl:variable name="ro-crate-root-properties" select="
		(: list all the properties of the 'root' object :)
		$ro-crate-properties[.('@id') = $ro-crate-root-id]
	"/>
	
	<xsl:result-document href="{$identifier}-tei-complete.xml">
		<TEI xml:id="{$identifier}">
			<teiHeader>
				<fileDesc>
					<titleStmt>
						<title>{$ro-crate-root-properties('name')}</title>
					</titleStmt>
					<publicationStmt>
						<publisher><ref target="https://nyingarn.net/">Nyingarn</ref></publisher>
					</publicationStmt>
					<sourceDesc>
						<p>{$ro-crate-root-properties('description')}</p>
					</sourceDesc>
					<xenoData type="application/ld+json">
						<xsl:sequence select="serialize($ro-crate, map{'method': 'json', 'indent': true()})"/>
					</xenoData>
				</fileDesc>
			</teiHeader>
			<text>
				<xsl:apply-templates mode="surface-to-text" select="$surfaces"/>
			</text>
		</TEI>
	</xsl:result-document>
    </xsl:template>
    
    <xsl:mode name="surface-to-text" on-no-match="shallow-copy"/>
    
    <!-- <surface> container elements are replaced with <pb> milestone elements -->
    <xsl:template match="surface" mode="surface-to-text">
    	<xsl:element name="pb"><xsl:copy-of select="@*"/></xsl:element>
    	<xsl:apply-templates mode="surface-to-text"/>
    </xsl:template>
    
    <!-- sequences of n <line> container elements are replaced with an anonymous block <ab> element
    divided by n-1 <lb/> milestone elements -->
    <xsl:key name="lines-by-first-line-id" match="line" use="preceding-sibling::line[last()] => generate-id()"/>
    <xsl:template match="line" mode="surface-to-text">
    	<xsl:element name="ab">
    		<xsl:copy-of select="@*"/>
    		<xsl:apply-templates mode="surface-to-text"/>
    		<xsl:for-each select="key('lines-by-first-line-id', generate-id())">
    			<xsl:element name="lb"><xsl:copy-of select="@*"/></xsl:element>
    			<xsl:apply-templates select="node()" mode="surface-to-text"/>
    		</xsl:for-each>
    	</xsl:element>
    </xsl:template>
    <!-- a second or subsequent <line> element is ignored in "surface-to-text" mode because it's handled by 
    the template matching the first <line> in a sequence of <lines> --> 
    <xsl:template match="line[preceding-sibling::*[1]/self::line]" mode="surface-to-text"/>
    
    <xsl:template name="reconstitute">
    	<!-- 
    	The $content parameter is a sequence of nodes which may include subsequences of 
    	contiguous elements with @part which need to be reconstituted as a single element,
    	and whose children need to be treated as a single sequence of content and reconstituted.
    	-->
    	<xsl:param name="content"/>
    	<!-- 
    	Process the content as groups, each group beginning with an element which is marked as an "initial" part,
    	or else beginning with a node which immediately follows a "final" part. 
    	The effect of this is that we should have groups of nodes which start with an "initial" part and run up until
    	the next "final" part, and also groups of nodes which aren't bracketed by an "initial" and "final" part. 
    	--> 
    	<xsl:for-each-group select="$content" group-starting-with="*[@part='I'] | node()[not(self::pb)][not(@part)]">
    		<xsl:choose>
    			<xsl:when test="@part='I'">
    				<!-- initial item in the current group is an "initial" part so the group
    				consists of sibling elements to be reconstituted -->
    				<xsl:copy>
    					<xsl:copy-of select="@* except @part"/>
    					<xsl:call-template name="reconstitute">
    						<xsl:with-param name="content" select="current-group()/(self::pb | node())"/>
    					</xsl:call-template>
    				</xsl:copy>
    			</xsl:when>
    			<xsl:otherwise>
    				<!-- current group are regular nodes which don't need to be changed -->
    				<xsl:copy-of select="current-group()"/>
    			</xsl:otherwise>
    		</xsl:choose>
    	</xsl:for-each-group>
    </xsl:template>
    
</xsl:stylesheet>
