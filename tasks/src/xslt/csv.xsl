<xsl:transform version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
	xmlns:csv="https://datatracker.ietf.org/doc/html/rfc4180" 
	xmlns:map="http://www.w3.org/2005/xpath-functions/map" 
	xmlns:err="http://www.w3.org/2005/xqt-errors"
	xmlns:nyingarn="https://nyingarn.net/ns/functions">

	<xsl:import href="error.xsl"/>
	
	<xsl:function name="csv:doc" as="map(*)*">
		<!-- Reads a CSV file and returns its contents as a sequence of maps -->
		<xsl:param name="href"/>
		<xsl:try>
			<xsl:variable name="text" select="unparsed-text($href)"/>
			<xsl:sequence select="csv:parse($text)"/>
			<!-- catch character encoding errors and throw Nyingarn encoding error -->
			<xsl:catch errors="err:FOUT1190 err:FOUT1200" select="
				nyingarn:error(
					'character-encoding-error',
					'Could not decode characters from the file',
					map{
						'code': $err:code,
						'description': $err:description
					}
				)
			"/>
		</xsl:try>
	</xsl:function>
	
	<!-- read a "cell" of data from the CSV text -->
	<!-- returns a string containing the raw cell data including the surrounding double quotes if the cell is quoted -->  
	<xsl:function name="csv:get-cell">
		<xsl:param name="text"/>
		<xsl:choose>
			<xsl:when test="not($text)">
				<!-- no more text in the file, so this final cell is empty -->
				<xsl:sequence select=" '' "/>
			</xsl:when>
			<xsl:when test="matches($text, '^[,\r\n]')">
				<!-- next character is a comma or line ending, so this cell is empty -->
				<xsl:sequence select=" '' "/>
			</xsl:when>
			<xsl:when test="substring($text, 1, 1) = $quote">
				<!-- start of a quoted cell -->
				<xsl:variable name="remaining-text" select="substring($text, 2)"/>
				<xsl:variable name="before-quote" select="substring-before($remaining-text, $quote)"/>
				<xsl:variable name="after-quote" select="substring-after($remaining-text, $quote)"/>
				<xsl:choose>
					<!-- we found a quote which is either the end of the cell data, or it's the first of a doubled quote -->
					<xsl:when test="substring($after-quote, 1, 1) = $quote">
						<!-- this is a doubled-quote -->
						<xsl:sequence select="$quote || $before-quote || $quote || csv:get-cell($after-quote)"/>
					</xsl:when>
					<xsl:otherwise>
						<xsl:sequence select="$quote || $before-quote || $quote"/>
					</xsl:otherwise>
				</xsl:choose>
			</xsl:when>
			<xsl:otherwise>
				<!-- not a quoted cell, so terminated by the next comma or end of line or end of file -->
				<xsl:sequence select="replace($text, '^([^,\r\n]+).*$', '$1', 's')"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:function>
	
	<xsl:function name="csv:get-raw-line-cells">
		<xsl:param name="text"/>
		<xsl:variable name="cell" select="csv:get-cell($text)"/>
		<xsl:variable name="cell-length" select="string-length($cell)"/>
		<xsl:variable name="next-char" select="substring($text, $cell-length + 1, 1)"/>
		<xsl:choose>
			<xsl:when test="$next-char = ','">
				<!-- there's more cells in this line, so return this cell, followed by all the remaining cells in this line -->
				<xsl:sequence select="($cell, csv:get-raw-line-cells(substring($text, $cell-length + 2)))"/>
			</xsl:when>
			<xsl:otherwise>
				<!-- there are no more cells in this line, so just return this, the last cell in this line -->
				<xsl:sequence select="$cell"/>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:function>

	<xsl:function name="csv:parse" as="map(*)*">
		<!-- 
		Converts the sequence of CSV lines into a sequence of maps. 
		The first line in the sequence contains column headings, and the subsequent rows contain data values.
		The returned sequence contains one map for each of the data rows. 
		Each map's keys are the column headings, and the values are the cells from that row.
		-->
		<xsl:param name="text"/>
		<xsl:variable name="raw-header-cells" select="csv:get-raw-line-cells($text)"/>
		<!-- the CSV data starts after the header line -->
		<xsl:variable name="header-line-length" select="csv:get-line-length($raw-header-cells)"/>
		<xsl:variable name="line-break-length" select="$text => substring($header-line-length + 1) => csv:get-line-break-length()"/>
		<xsl:variable name="data-text" select="substring($text, 1 + $header-line-length + $line-break-length)"/>
		<xsl:variable name="header-cells" select="for $header in $raw-header-cells return csv:unescape($header)"/>
		<xsl:sequence select="csv:parse-data-lines($data-text, $header-cells)"/>
	</xsl:function>
	
	<xsl:function name="csv:get-line-break-length">
		<xsl:param name="text"/>
		<!-- assumes that the first character of $text is the start of a line break; 
		returns the full line break which is some sequence of CR and LF chars -->
		<xsl:variable name="line-break" select="replace($text, '^([\r\n]+).*$', '$1', 's')"/>
		<xsl:sequence select="$line-break => string-length()"/>
	</xsl:function>

	<xsl:function name="csv:get-header-cells" as="item()*">
		<!-- 
		The returned sequence contains the column-headers as unescaped strings
		-->
		<xsl:param name="text"/>
		<xsl:variable name="raw-header-cells" select="csv:get-raw-line-cells($text)"/>
		<xsl:sequence select="for $header in $raw-header-cells return csv:unescape($header)"/>
	</xsl:function>
		
	<xsl:function name="csv:parse-data-lines">
		<xsl:param name="text"/>
		<xsl:param name="header-cells"/>
		<xsl:variable name="raw-data-cells" select="csv:get-raw-line-cells($text)"/>
		<xsl:variable name="data-line-length" select="csv:get-line-length($raw-data-cells)"/>
		<xsl:variable name="line-break-length" select="$text => substring(1 + $data-line-length) => csv:get-line-break-length()"/>
		<xsl:variable name="remaining-text" select="substring($text, 1 + $data-line-length + $line-break-length)"/>
		<xsl:variable name="data-cells" select="for $cell in $raw-data-cells return csv:unescape($cell)"/>
		<xsl:sequence select="
			map:merge(
				for-each-pair(
					$header-cells, 
					$data-cells, 
					function($header, $data) {
						map:entry($header, $data)
					}
				)
			)
		"/>
		<!-- recurse with remainder of the text -->
		<xsl:if test="string-length($remaining-text) &gt; 0">
			<xsl:sequence select="csv:parse-data-lines($remaining-text, $header-cells)"/>
		</xsl:if>
	</xsl:function>
	
	<xsl:function name="csv:get-line-length">
		<xsl:param name="line-cells"/>
		<xsl:sequence select="
			(: calculate length of each cell :)
			sum(for $cell in $line-cells return string-length($cell))
			(: ... and comma separators :)
			+ count($line-cells) - 1
		"/>
	</xsl:function>

	<xsl:function name="csv:unescape">
		<!-- unescapes a raw string value drawn from the CSV -->
		<xsl:param name="value"/>
		<xsl:variable name="unquoted" select="
			if ($value => starts-with($quote) and $value => ends-with($quote)) then
				substring($value, 2, string-length($value) - 2)
			else
				$value
		"/>
		<xsl:sequence select="
			$unquoted 
				=> replace($doubled-quotes, $quote) (: quotes in CSV are doubled :)
		"/>
	</xsl:function>
	
	<xsl:function name="csv:escape">
		<!-- escapes a string value so it can be written to CSV -->
		<!-- NB this function always renders the value enclosed in double quotes --> 
		<xsl:param name="value"/>
		<xsl:sequence select="$quote || replace($value, $quote, $doubled-quotes) || $quote"/>
	</xsl:function>

	<xsl:variable name="doubled-quotes" select="'&quot;&quot;'"/>
	<xsl:variable name="quote" select="'&quot;'"/>

</xsl:transform>
