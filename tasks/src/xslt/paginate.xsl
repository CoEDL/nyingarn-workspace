<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    version="3.0"
    xpath-default-namespace="http://www.tei-c.org/ns/1.0"
    xmlns="http://www.tei-c.org/ns/1.0"
    expand-text="yes">

    <xsl:output indent="yes" method="xml"/>

    <xsl:mode on-no-match="shallow-copy" name="paginate"/>

    <xsl:template match="/TEI/text" mode="paginate">
	<!-- replace the text with a sourceDoc -->
	<!-- write each page of content to a separate XML file -->
	<xsl:variable name="content" select="body/node()"/>
	<xsl:variable name="page-breaks" select="$content/self::pb"/>
	<sourceDoc>
	    <xsl:for-each select="$page-breaks">
		<!-- write the page content as a surface element -->
		<xsl:variable name="current-page-break" select="."/>
		<!-- write out the content between the current page break and the next page break -->
		<surface>
		    <xsl:copy-of select="$current-page-break/@*"/><!-- copy the @facs, @xml:id, etc, attributes from the pb element which maps to this surface -->
		    <xsl:sequence select="$current-page-break/following-sibling::node()[not(self::pb)][preceding-sibling::pb[1] is $current-page-break]"/>
		</surface>
	    </xsl:for-each>
	</sourceDoc>
    </xsl:template>

    <xsl:mode on-no-match="shallow-copy" name="bubble-pagebreaks"/>

    <xsl:template match="body//*" mode="bubble-pagebreaks">
	<xsl:variable name="container" select="."/>
	<xsl:variable name="paginated-content">
	    <xsl:apply-templates mode="bubble-pagebreaks"/>
	</xsl:variable>
	<!-- any of the container element's pb descendants will have "bubbled up" to the level of direct children of the container -->
	<xsl:variable name="page-breaks" select="$paginated-content/pb"/>
	<xsl:choose>
	    <xsl:when test="$page-breaks">
		<!-- the container element contains page breaks so will need to be split around those pb elements,
		except that if the preceding siblings of the FIRST page break are empty or white space, i.e. the
		first page is at the top of the container, then the page break may simply be moved to be before the
		container element rather than splitting it -->
		<xsl:variable name="first-page-break-at-top-of-container" select="$page-breaks[1][not(preceding-sibling::node()[normalize-space()])]"/>
		<xsl:choose>
		    <xsl:when test="$first-page-break-at-top-of-container">
			<xsl:sequence select="$page-breaks[1]"/>
			<xsl:copy select="$container">
			    <xsl:copy-of select="$container/@*"/>
			    <xsl:sequence select="$paginated-content/node()[preceding-sibling::pb[1] is $first-page-break-at-top-of-container][not(self::pb)]"/>
			</xsl:copy>
		    </xsl:when>
		    <xsl:otherwise>
			<!-- create the initial fragment of the original container element -->
			<xsl:copy select="$container">
			    <xsl:copy-of select="$container/@*"/>
			    <xsl:attribute name="part">I</xsl:attribute><!-- I = initial part -->
			    <!-- output the portion of the paginated content preceding the first pb -->
			    <xsl:sequence select="$paginated-content/node()[following-sibling::pb[1] is $page-breaks[1]]"/>
			</xsl:copy>
		    </xsl:otherwise>
		</xsl:choose>

		<!-- create the remaining fragments of the container element, interspersed with the pb elements which have divided them -->
		<xsl:for-each select="$paginated-content/pb except $first-page-break-at-top-of-container">
		    <xsl:variable name="pb" select="."/>
		    <xsl:copy-of select="$pb"/>
		    <xsl:copy select="$container">
			<xsl:copy-of select="$container/@*"/>
			<xsl:attribute name="part" select="if ($pb/following-sibling::pb) then 'M' (:medial:) else 'F' (:final:)"/>
			<!-- output the portion of the paginated content following this pb but before the next pb -->
			<xsl:sequence select="$paginated-content/node()[preceding-sibling::pb[1] is $pb][not(self::pb)]"/>
		    </xsl:copy>
		</xsl:for-each>
	    </xsl:when>
	    <xsl:otherwise>
		<!-- container element had no pb descendants, so it does not need to be split -->
		<xsl:sequence select="$container"/>
	    </xsl:otherwise>
	</xsl:choose>

    </xsl:template>

</xsl:stylesheet>
