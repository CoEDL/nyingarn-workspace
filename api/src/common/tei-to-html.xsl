<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="3.0"
	xmlns:c="http://www.w3.org/ns/xproc-step" 
	xmlns:tei="http://www.tei-c.org/ns/1.0"
	xmlns:xs="http://www.w3.org/2001/XMLSchema"
	xmlns="http://www.w3.org/1999/xhtml"
	xpath-default-namespace="http://www.tei-c.org/ns/1.0">
	
	<!-- https://www.tei-c.org/release/doc/tei-p5-doc/en/html/ST.html#STBTC -->
	<!-- TEI "phrase-level", model.global.edit, "gLike", and "lLike" elements are mapped to html:span -->
	<!-- Also tei:q, tei:quote -->
	<xsl:template priority="-0.1" match="
		author | fw
		|
		binaryObject | formula | graphic | media | code | distinct | emph | foreign | gloss | ident | mentioned | 
		soCalled | term | title | hi | caesura | rhyme | address | affiliation | email | date | time | depth | dim | 
		geo | height | measure | measureGrp | num | unit | width | name | orgName | persName | geogFeat |
		offset | addName | forename | genName | nameLink | roleName | surname | bloc | country | district | 
		geogName | placeName | region | settlement | climate | location | population | state | terrain | trait | 
		idno | lang | objectName | rs | abbr | am | choice | ex | expan | subst | add | corr | damage | del | 
		handShift | mod | orig | redo | reg | restore | retrace | secl | sic | supplied | surplus | unclear | undo | 
		catchwords | dimensions | heraldry | locus | locusGrp | material | objectType | origDate | origPlace | 
		secFol | signatures | stamp | watermark | att | gi | tag | val | ptr | ref | oRef | pRef | c | cl | m | pc | 
		phr | s | seg | w | specDesc | specList
		|
		addSpan | app | damageSpan | delSpan | gap | space | witDetail
		|
		g
		|
		l
		|
		q
		|
		quote
		|
		biblScope
	">
		<xsl:element name="span">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	
	<!-- non-phrase-level TEI elements (plus author and title within the item description) are mapped to html:div -->
	<xsl:template match="*">
		<xsl:element name="div">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	
	<!-- populate an HTML element's set of attributes -->
	<xsl:template mode="create-attributes" match="*">
		<!-- the type, place, and rend attributes are all useful data for CSS styles -->
		<xsl:attribute name="class" select="
			string-join(
				(
					concat('tei-', local-name()),
					for $type in tokenize(@type) return concat('type-', $type),
					for $place in tokenize(@place) return concat('place-', $place),
					for $rend in tokenize(@rend) return concat('rend-', $rend)
				),
				' '
			)
		"/>
		<xsl:for-each select="@style"><xsl:attribute name="style" select="."/></xsl:for-each>
		<xsl:for-each select="@xml:lang"><xsl:attribute name="lang" select="."/></xsl:for-each>
		<xsl:for-each select="@target"><xsl:attribute name="href" select="."/></xsl:for-each>
		<xsl:for-each select="@xml:id"><xsl:attribute name="id" select="."/></xsl:for-each>
	</xsl:template>
	
	<!-- populate an HTML element's content -->
	<xsl:template mode="create-content" match="*">
		<!-- The content of an HTML element which represents a TEI element is normally produced by applying templates to the children of a TEI element. -->
		<!-- This can be over-ridden for specific TEI elements, e.g. <tei:space/> is an empty element, but it should produce an actual space character in the HTML -->
		<xsl:apply-templates/>
	</xsl:template>
	<xsl:template mode="create-content" match="p">
		<xsl:next-match/>
		<!-- add white space so that if the HTML is converted to plain text, we don't run last word together with first word of next para -->
		<xsl:value-of select="codepoints-to-string(10)"/>
	</xsl:template>
	
	<!-- supplied/@reason ⇒ @title -->
	<xsl:template match="supplied" mode="create-attributes">
		<xsl:next-match/>
		<xsl:attribute name="title" select="concat('supplied; reason: ', @reason)"/>
	</xsl:template>
	
	<!-- ignore blank div elements -->
	<xsl:template match="div[not(normalize-space(.))]"/>
	
	<xsl:template match="gap" mode="create-content">
		<xsl:text> [illegible] </xsl:text>
	</xsl:template>
	<xsl:template match="gap" mode="create-attributes">
		<xsl:next-match/>
		<xsl:attribute name="title" select="
			string-join(
				(
					'illegible; reason:',
					@reason,
					@extent
				),
				' '
			)
		"/>
	</xsl:template>
	<xsl:template match="unclear[@reason]" mode="create-attributes">
		<xsl:next-match/>
		<xsl:attribute name="title" select="
			string-join(
				(
					'illegible; reason:',
					@reason,
					@extent
				),
				' '
			)
		"/>
	</xsl:template>
	
	<!-- abbreviations -->
	<!-- a choice containing abbr and expan => abbr with the expansion in the title attribute -->
	<xsl:template match="choice[abbr][expan]">
		<xsl:element name="abbr">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	<!-- the expan element is rendered into the abbr's title attribute -->
	<xsl:template match="choice[expan]" mode="create-attributes" priority="999">
		<xsl:attribute name="title" select="expan"/>
		<xsl:next-match/>
	</xsl:template>
	<!-- the expan element does not generate any text content -->
	<xsl:template match="choice/expan"/>
	
	<xsl:template match="choice/sic"/>
	
	<!-- choice sub-elements which should be suppressed or captured only in attribute values -->
	<xsl:template match="choice/orig | choice/sic | choice/expan" priority="1"/>
	
	<!-- quantified significant white space -->
	<xsl:template match="space[@quantity castable as xs:integer]" mode="create-content">
		<xsl:choose>
			<xsl:when test="@dim='vertical'">
				<xsl:for-each select="1 to @quantity">
					<lb/>
				</xsl:for-each>
			</xsl:when>
			<xsl:otherwise>
				<xsl:for-each select="1 to @quantity">
					<xsl:value-of select="codepoints-to-string(160)"/>
				</xsl:for-each>
			</xsl:otherwise>
		</xsl:choose>
	</xsl:template>
	<xsl:template match="lb">
		<xsl:element name="br"/>
	</xsl:template>
	
	<!-- section breaks -->
	<xsl:template match="milestone">
		<xsl:element name="hr">
			<xsl:apply-templates mode="create-attributes" select="."/>
		</xsl:element>
	</xsl:template>
	
	<!-- figures -->
	<xsl:template match="figure">
		<xsl:element name="figure">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="figDesc">
		<xsl:element name="figcaption">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="graphic">
		<xsl:element name="img">
			<xsl:attribute name="src" select="@url"/>
		</xsl:element>
	</xsl:template>
	
	<!-- glossed terms -->
	<!-- link to the appropriate gloss for this term, and store the result in the @title attribute -->
	<xsl:template match="term[@corresp]" mode="create-attributes">
		<xsl:variable name="gloss" select="@corresp => substring-after('#') => id()"/>
		<xsl:attribute name="title" select="$gloss"/>
		<xsl:next-match/>
	</xsl:template>
	
	<!-- lists and tables -->
	<xsl:template match="list" priority="1">
		<xsl:apply-templates select="tei:head"/><!-- HTML list headings must precede <ul> element -->
		<xsl:element name="{if (@type='ordered') then 'ol' else 'ul'}">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<!-- generate child <li> only for list/item, not e.g. list/milestone -->
			<xsl:apply-templates select="tei:item"/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="item" priority="1">
		<li>
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:variable name="current-item" select="."/>
			<!-- include a rendition of the preceding non-<item>, non-<head> siblings as part of this <li> -->
			<xsl:apply-templates select="preceding-sibling::*[not(self::tei:item | self::tei:head)][following-sibling::tei:item[1] is $current-item]"/>
			<xsl:apply-templates mode="create-content" select="."/>
		</li>
	</xsl:template>
	<xsl:template match="table" priority="1">
		<table>
			<xsl:apply-templates mode="create-attributes" select="."/>
			<!-- generate child <caption> and <tr> only for table, not e.g. table/milestone -->
			<xsl:apply-templates select="tei:head | tei:row"/>
		</table>
	</xsl:template>
	<xsl:template match="table/head" priority="1">
		<caption>
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</caption>
	</xsl:template>
	<xsl:template match="row" priority="1">
		<tr>
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:variable name="current-row" select="."/>
			<!-- include a rendition of the preceding non-<row> siblings as part of this <tr> -->
			<xsl:apply-templates select="preceding-sibling::*[not(self::tei:row)][following-sibling::tei:row[1] is $current-row]"/>
			<xsl:apply-templates mode="create-content" select="."/>
		</tr>
	</xsl:template>
	<xsl:template match="cell" priority="1">
		<td>
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:if test="@cols">
				<xsl:attribute name="colspan" select="@cols"/>
			</xsl:if>
			<xsl:if test="@rows">
				<xsl:attribute name="rowspan" select="@rows"/>
			</xsl:if>
			<xsl:variable name="current-cell" select="."/>
			<!-- include a rendition of the preceding non-<cell> siblings as part of this <td> -->
			<xsl:apply-templates select="preceding-sibling::*[not(self::tei:cell)][following-sibling::tei:cell[1] is $current-cell]"/>
			<xsl:apply-templates mode="create-content" select="."/>
		</td>
	</xsl:template>
	<xsl:template match="head | argument">
		<xsl:element name="header">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="anchor">
		<xsl:element name="a">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="ref[@target]">
		<!-- a link to an annotation -->
		<xsl:element name="a">
			<xsl:apply-templates mode="create-attributes" select="."/>
			<xsl:attribute name="title" select="substring-after(@target, '#') => id() => normalize-space()"/>
			<xsl:apply-templates mode="create-content" select="."/>
		</xsl:element>
	</xsl:template>
	<xsl:template match="ref[@n]" mode="create-content">
		<xsl:value-of select="@n"/>
	</xsl:template>
	<xsl:template match="note[@n]" mode="create-content">
		<span class="tei-note-n"><xsl:value-of select="."/> </span>
		<xsl:next-match/>
	</xsl:template>
	<xsl:template match="name[reg]" mode="create-attributes">
		<xsl:attribute name="title" select="reg"/>
	</xsl:template>
	<xsl:template match="name/reg"/>
	
</xsl:stylesheet>
