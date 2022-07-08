<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="3.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:import href="normalise.xsl"/>
    <xsl:import href="csv.xsl"/>

    <xsl:template name="xsl:initial-template">
	<xsl:param name="source-uri"/>
	<xsl:param name="identifier"/>
	<xsl:param name="title"/>
	<xsl:param name="publisher"/>
	<xsl:param name="source-description"/>
	<!-- generate an output file name; trim off the extension from the main source file, and append "-final.xml" -->
	<xsl:variable name="output-file-name" select="replace($source-uri, '([^.]+).*', '$1-final.xml')"/>
	<xsl:result-document href="{$output-file-name}">
		<xsl:choose>
			<xsl:when test="$source-uri => ends-with('.csv')">
				<!-- generate a full TEI file from a digivol csv file and the previously generated TEI surface files -->
				<xsl:variable name="csv-rows" select="csv:doc($source-uri)" xmlns:csv="https://datatracker.ietf.org/doc/html/rfc4180"/>
				<xsl:variable name="relevant-rows" select="
					$csv-rows
						[.('externalIdentifier') => starts-with($identifier || '-')] (: the surfaces we want are those whose identifier starts with the id of the item, followed by a hyphen :)
				"/>
				<TEI xmlns="http://www.tei-c.org/ns/1.0" xml:id="{$identifier}">
					<teiHeader>
						<fileDesc>
							<titleStmt>
								<title>{$title}</title>
							</titleStmt>
							<publicationStmt>
								<publisher>{$publisher}</publisher>
							</publicationStmt>
							<sourceDesc>
								<bibl>{$source-description}</bibl>
							</sourceDesc>
						</fileDesc>
					</teiHeader>
					<text>
						<body>
							<!-- for each row of the CSV file, insert a page break, followed by the content of the corresponding surface file -->
							<xsl:for-each select="$relevant-rows">
								<xsl:variable name="row" select="."/>
								<xsl:variable name="surface-id" select="
									.('externalIdentifier') 
									=> substring-before('.') 
								"/>
								<pb xml:id="{$surface-id}" facs="{.('externalIdentifier')}"/>
								<xsl:variable name="surface-doc" select="
									$surface-id
									=> concat('.tei.xml')
									=> resolve-uri($source-uri) 
									=> document()
								"/>
								<xsl:sequence select="$surface-doc/surface/node()"/>
							</xsl:for-each>
						</body>
					</text>
				</TEI>
			</xsl:when>
			<xsl:otherwise>
				<!-- generate a full TEI file from an ingested TEI file, incorporating the previously generated TEI surface files -->
				<xsl:variable name="original" select="document($source-uri)"/>
				<xsl:variable name="normalised-original">
					<xsl:apply-templates select="$original" mode="normalise"/>
				</xsl:variable>
				<xsl:apply-templates select="$normalised-original" mode="reconstitute">
					<xsl:with-param name="source-uri" select="$source-uri" tunnel="yes"/>
					<xsl:with-param name="title" select="$title" tunnel="yes"/>
					<xsl:with-param name="publisher" select="$publisher" tunnel="yes"/>
					<xsl:with-param name="source-description" select="$source-description" tunnel="yes"/>
				</xsl:apply-templates>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:result-document>
    </xsl:template>
    
    <xsl:mode name="reconstitute" on-no-match="shallow-copy"/>
    
    <!-- when reconstituting a TEI file, insert the supplied title into the appropriate part of the header -->
    <xsl:template match="TEI/teiHeader/fileDesc/titleStmt" mode="reconstitute">
    	<xsl:param name="title" tunnel="yes"/>
    	<xsl:copy>
    		<xsl:copy-of select="@*"/>
	    	<xsl:if test="not(title = $title)"><!-- don't insert the title if it would exactly duplicate one that's there already -->
	    		<title><xsl:value-of select="$title"/></title>
	    	</xsl:if>
    		<!-- copy the pre-existing content of titleStmt -->
		<xsl:copy-of select="*"/>
	    </xsl:copy>
    </xsl:template>

    <!-- when reconstituting a TEI file, insert the supplied title into the appropriate part of the header -->
    <xsl:template match="TEI/teiHeader/fileDesc/publicationStmt" mode="reconstitute">
    	<xsl:param name="publisher" tunnel="yes"/>
    	<xsl:copy>
    		<xsl:copy-of select="@*"/>
    		<xsl:choose>
    			<xsl:when test="publisher | authority | distributor">
    				<!-- publicationStmt already has an element which is a member of model.publicationStmtPart.agency -->
    				<!-- so add the new publisher as a publisher element (unless it would exactly duplicate one that's there already) -->
    				<xsl:if test="not(publisher = $publisher)">
    					<publisher><xsl:value-of select="$publisher"/></publisher>
    				</xsl:if>
    			</xsl:when>
    			<xsl:otherwise>
    				<!-- publicationStmt must contain only model.pLike elements, so our publisher must also take that form -->
    				<p>Publisher: <xsl:value-of select="$publisher"/></p>
    			</xsl:otherwise>
    		</xsl:choose>
    		<!-- copy the pre-existing content of publicationStmt -->
		<xsl:copy-of select="*"/>
	    </xsl:copy>
    </xsl:template>

    <!-- when reconstituting a TEI file, insert the supplied source-description into the appropriate part of the header -->
    <xsl:template match="TEI/teiHeader/fileDesc/sourceDesc" mode="reconstitute">
    	<xsl:param name="source-description" tunnel="yes"/>
    	<xsl:copy>
    		<xsl:copy-of select="@*"/>
    		<xsl:choose>
    			<xsl:when test="
    				bibl | biblFull | biblStruct | listBibl | msDesc (: model.biblLike :)
    				| recordingStmt | scriptStmt (: model.sourceDescPart :)
    				| list | listApp | listEvent | listNym | listObject | listOrg | listPerson | listPlace | listRelation | listWit | table (: model.listLike :)
    			">
    				<!-- sourceDesc already has an element which is a member of model.biblLike, model.sourceDescPart, or model.listLike  -->
    				<!-- so add the new source-description as a bibl element (unless it would exactly duplicate one that's there already) -->
    				<xsl:if test="not(bibl = $source-description)">
    					<bibl><xsl:value-of select="$source-description"/></bibl>
    				</xsl:if>
    			</xsl:when>
    			<xsl:otherwise>
    				<!-- sourceDesc must contain only model.pLike elements, so our source-description must also take that form -->
    				<p><xsl:value-of select="$source-description"/></p>
    			</xsl:otherwise>
    		</xsl:choose>
    		<!-- copy the pre-existing content of sourceDesc -->
		<xsl:copy-of select="*"/>
    	</xsl:copy>
    </xsl:template>
    
    <xsl:template match="text" mode="reconstitute">
	<!-- replace the content of the text with content drawn from the various fragment files and stitched together -->
	<xsl:param name="source-uri" tunnel="yes"/>
	<xsl:variable name="original-page-breaks" select=".//pb"/>
	<xsl:variable name="content">
	    <xsl:for-each select="$original-page-breaks">
	    	<!-- insert the original page break -->
	    	<xsl:copy-of select="."/>
	    	<!-- insert the content of the surface file that corresponds to this page break -->
		<xsl:variable name="surface-doc" select="@xml:id => concat('.tei.xml') => resolve-uri($source-uri) => document()"/>
		<xsl:variable name="surface-content" select="$surface-doc/surface/node()"/>
		<xsl:sequence select="$surface-doc/surface/node()"/>
	    </xsl:for-each>
	</xsl:variable>
	<xsl:copy>
		<body>
			<xsl:call-template name="reconstitute">
				<xsl:with-param name="content" select="$content/*"/>
			</xsl:call-template>
		</body>
	</xsl:copy>
    </xsl:template>
    
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
