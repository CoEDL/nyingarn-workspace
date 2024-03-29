
<p:declare-step version="1.0" name="nyingarn" 
	xmlns:cx="http://xmlcalabash.com/ns/extensions" 
	xmlns:p="http://www.w3.org/ns/xproc" 
	xmlns:c="http://www.w3.org/ns/xproc-step" 
	xmlns:z="https://github.com/Conal-Tuohy/XProc-Z"
	xmlns:fn="http://www.w3.org/2005/xpath-functions"
	xmlns:xhtml="http://www.w3.org/1999/xhtml"
	xmlns:nyingarn="https://nyingarn.net/ns/functions">
	
	<p:input port="source" primary="true"/>
	<!-- e.g.
		<request xmlns="http://www.w3.org/ns/xproc-step"
		  method = NCName
		  href? = anyURI
		  detailed? = boolean
		  status-only? = boolean
		  username? = string
		  password? = string
		  auth-method? = string
		  send-authorization? = boolean
		  override-content-type? = string>
			 (c:header*,
			  (c:multipart |
				c:body)?)
		</request>
	-->
	
	<p:input port="parameters" kind="parameter" primary="true"/>
	<p:output port="result" primary="true" sequence="true"/>
	
	<p:import href="xproc-z-library.xpl"/>
	
	<p:declare-step name="html-page" type="nyingarn:html-page">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:option name="page" required="true"/>
		<p:load>
			<p:with-option name="href" select="concat('../html/', $page, '.html')"/>
		</p:load>
		<p:xslt>
			<p:input port="parameters"><p:empty/></p:input>
			<p:input port="stylesheet"><p:document href="../xslt/style-html.xsl"/></p:input>
		</p:xslt>
	</p:declare-step>
	
	<!-- 
		Package the source XML into an HTTP response:
		If it's a JSON-XML map containing a 'name' and a 'code' property, regard it as an error: convert it to JSON and return it with an HTTP 400 error code.
		If it's other JSON-XML, return it as JSON with a 200 OK status
		If it's XML including XHTML, return it as XML with a 200 OK
	-->
	<p:declare-step name="make-http-response" type="nyingarn:make-http-response"  xmlns:fn="http://www.w3.org/2005/xpath-functions">
		<p:input port="source"/>
		<p:output port="result"/>
		<!-- if the result to be returned is a JSON object containing both a "name" and a "code" property, then it's assumed to represent an error --> 
		<p:variable name="status" select="
			if (/fn:map[fn:string/@key='name'][fn:string/@key='code']) then 
				'400' 
			else 
				'200'
		"/>
		<p:variable name="content-type" select="
			if (/xhtml:html) then 
				'application/xhtml+xml; charset=utf-8'
			else if (/fn:string) then
				'text/plain; charset=utf-8'
			else if (/fn:*) then
				'application/json'
			else
				'application/xml; charset=utf-8'
		"/>
		<p:template name="http-response">
			<p:with-param name="status" select="$status"/>
			<p:with-param name="content-type" select="$content-type"/>
			<p:input port="template">
				<p:inline>
					<c:response status="{$status}">
						<c:body content-type="{$content-type}">{
							if ($content-type='text/plain; charset=utf-8') then
								(: convert a single JSON-XML string to plain text :)
								string(/*)
							else if ($content-type='application/json') then
								(: convert other JSON-XML to JSON :)
								xml-to-json(/*)
							else 
								(: copy other XML unchanged :)
								/*
						}</c:body>
					</c:response>
				</p:inline>
			</p:input>
		</p:template>
	</p:declare-step>
	
	<p:variable name="uri-path" select="replace(/c:request/@href, 'http://.*?/([^?]*).*', '$1')"/>
	<p:variable name="method" select="/c:request/@method"/>
	
	<z:dump href="/tmp/request.xml"/>

	<!-- route HTTP request to the relevant sub-pipeline -->
	<p:choose>
		<p:when test="$uri-path='nyingarn/'">
			<nyingarn:html-page page="index"/>
		</p:when>
		<p:when test="$uri-path='nyingarn/validate-with-schematron'">
			<p:choose>
				<p:when test="
					//c:body/@disposition[starts-with(., 'form-data; name=&quot;instance&quot;')] and
					//c:body/@disposition[starts-with(., 'form-data; name=&quot;schema&quot;')]
				">
					<!-- schema and instance document(s) are present in the request -->
					<p:choose>
						<p:when test="
							count(//c:body/@disposition[starts-with(., 'form-data; name=&quot;instance&quot;')]) gt 1 and
							//c:body/@disposition[starts-with(., 'form-data; name=&quot;schema&quot;')]
						">
							<!-- multiple instances were uploaded; wrap each in a c:file and wrap the c:file elements in a c:directory -->
							<p:wrap-sequence wrapper="c:directory">
								<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;instance&quot;')]/*">
									<p:pipe step="nyingarn" port="source"/>
								</p:input>
							</p:wrap-sequence>
							<p:wrap wrapper="c:file" match="/c:directory/*"/>
						</p:when>
						<p:otherwise>
							<!-- only a single instance was uploaded; pass the instance document, unwrapped, to the schema validator -->
							<p:identity>
								<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;instance&quot;')]/*">
									<p:pipe step="nyingarn" port="source"/>
								</p:input>
							</p:identity>
						</p:otherwise>
					</p:choose>
					<p:try>
						<p:group>
							<p:validate-with-schematron name="validate-with-schematron" assert-valid="false">
								<p:input port="schema" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;schema&quot;')]/*">
									<p:pipe step="nyingarn" port="source"/>
								</p:input>
							</p:validate-with-schematron>
							<p:xslt name="return-schematron-report">
								<p:input port="parameters"><p:empty/></p:input>
								<p:input port="stylesheet">
									<p:document href="../xslt/return-schematron-report.xsl"/>
								</p:input>
								<p:input port="source">
									<p:pipe step="validate-with-schematron" port="report"/>
								</p:input>
							</p:xslt>
						</p:group>
						<p:catch name="schematron-validation-error">
							<p:variable name="error" select="/c:errors/c:error[1]">
								<p:pipe step="schematron-validation-error" port="error"/>
							</p:variable>
							<p:template>
								<p:with-param name="code" select="concat('Q{', namespace-uri-from-QName($error/@code), '}', local-name-from-QName($error/@code))"/>
								<p:with-param name="name" select="$error/@name"/>
								<p:with-param name="href" select="$error/@href"/>
								<p:with-param name="line" select="$error/@line"/>
								<p:with-param name="column" select="$error/@column"/>
								<p:input port="template">
									<p:inline>
										<fn:map>
											<fn:string key="name">{$name}</fn:string>
											<fn:string key="code">{$code}</fn:string>
											<fn:string key="message">An error occurred during Schematron validation</fn:string>
											<fn:string key="fileName">{$href}</fn:string>
											<fn:number key="lineNumber">{$line}</fn:number>
											<fn:number key="columnNumber">{$column}</fn:number>
										</fn:map>
									</p:inline>
								</p:input>
							</p:template>
						</p:catch>
					</p:try>
				</p:when>
				<p:otherwise>
					<!-- schema and instance files not uploaded, so display an upload form -->
					<nyingarn:html-page page="validate-with-schematron"/>
				</p:otherwise>
			</p:choose>
		</p:when>
		<p:when test="$uri-path='nyingarn/extract-text'">
			<p:choose>
				<p:when test="//c:body/@disposition[starts-with(., 'form-data; name=&quot;source&quot;')]">
					<!-- pass the document to the text-extraction stylesheet -->
					<p:xslt name="extract-plain-text">
						<p:input port="parameters"><p:empty/></p:input>
						<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;source&quot;')]/*">
							<p:pipe step="nyingarn" port="source"/>
						</p:input>
						<p:input port="stylesheet">
							<p:document href="../xslt/extract-plain-text.xsl"/>
						</p:input>
					</p:xslt>
				</p:when>
				<p:otherwise>
					<!-- file was not uploaded; display an upload form, for manual testing -->
					<nyingarn:html-page page="extract-text"/>
				</p:otherwise>
			</p:choose>
		</p:when>

		<p:when test="$uri-path='nyingarn/extract-text-by-page'">
			<p:choose>
				<p:when test="//c:body/@disposition[starts-with(., 'form-data; name=&quot;source&quot;')]">
					<!-- pass the document to the text-extraction stylesheet -->
					<p:xslt name="extract-plain-text">
						<p:input port="parameters"><p:empty/></p:input>
						<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;source&quot;')]/*">
							<p:pipe step="nyingarn" port="source"/>
						</p:input>
						<p:input port="stylesheet">
							<p:document href="../xslt/extract-plain-text-by-page.xsl"/>
						</p:input>
					</p:xslt>
				</p:when>
				<p:otherwise>
					<!-- file was not uploaded; display an upload form, for manual testing -->
					<nyingarn:html-page page="extract-text-by-page"/>
				</p:otherwise>
			</p:choose>
		</p:when>
		<p:when test="$uri-path='nyingarn/ingest-tei'">
			<p:choose>
				<p:when test="//c:body/@disposition[starts-with(., 'form-data; name=&quot;source&quot;')]">
					<p:choose>
						<!-- Malformed XML was uploaded -->
						<p:when test="//c:body[starts-with(@disposition, 'form-data; name=&quot;source&quot;')][not(*)]">
							<!-- We know uploaded XML was malformed, because XProc-Z has failed to parse it as XML, and has instead
							provided the unparsed XML as a text node within a c:body which therefore has no child element. 
							Here we can reattempt to parse the XML, and return a helpful error message to the http client -->
							<p:xslt name="report-parse-error">
								<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;source&quot;')][not(*)][1]">
									<p:pipe step="nyingarn" port="source"/>
								</p:input>
								<p:input port="parameters"><p:empty/></p:input>
								<p:input port="stylesheet">
									<p:document href="../xslt/parse-broken-xml.xsl"/>
								</p:input>
							</p:xslt>
						</p:when>
						<p:otherwise>
							<!-- XML upload does exist and contains parsed XML - paginate it -->
							<p:xslt name="process-tei-to-page-files">
								<p:with-param name="identifier" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;identifier&quot;')]"/>
								<p:with-param name="page-identifier-regex" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;page-identifier-regex&quot;')]"/>
								<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;source&quot;')]/*">
									<p:pipe step="nyingarn" port="source"/>
								</p:input>
								<p:input port="stylesheet">
									<p:document href="../xslt/process-tei-to-page-files.xsl"/>
								</p:input>
							</p:xslt>
						</p:otherwise>
					</p:choose>
				</p:when>
				<p:otherwise>
					<!-- file was not uploaded; display an upload form, for manual testing -->
					<nyingarn:html-page page="ingest-tei"/>
				</p:otherwise>
			</p:choose>
		</p:when>
		<p:when test="$uri-path='nyingarn/ingest-json'">
			<p:choose>
				<p:when test="//c:body/@disposition[starts-with(., 'form-data; name=&quot;source&quot;')]">
					<!-- upload exists - paginate it -->
					<p:xslt name="process-digivol-csv-to-page-files">
						<p:with-param name="identifier" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;identifier&quot;')]"/>
						<p:with-param name="page-identifier-regex" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;page-identifier-regex&quot;')]"/>
						<p:input port="source" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;source&quot;')]">
							<p:pipe step="nyingarn" port="source"/>
						</p:input>
						<p:input port="stylesheet">
							<p:document href="../xslt/process-digivol-csv-to-page-files.xsl"/>
						</p:input>
					</p:xslt>
				</p:when>
				<p:otherwise>
					<!-- file was not uploaded; display an upload form, for manual testing -->
					<nyingarn:html-page page="ingest-json"/>
				</p:otherwise>
			</p:choose>
		</p:when>
		<p:when test="$uri-path='nyingarn/reconstitute-tei'">
			<!-- reconstitute an RO Crate metadata file and a set of TEI surface files into a single TEI file --> 
			<p:choose>
				<p:when test="//c:body/@disposition[starts-with(., 'form-data; name=&quot;source&quot;')]">
					<!-- at least one upload exists, so we can reconsitute the uploaded files into a single TEI file -->
					<p:xslt name="process-digivol-csv-to-page-files">
						<p:with-param name="identifier" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;identifier&quot;')]"/>
						<p:with-param name="page-identifier-regex" select="//c:body[starts-with(@disposition, 'form-data; name=&quot;page-identifier-regex&quot;')]"/>
						<p:input port="stylesheet">
							<p:document href="../xslt/reconstitute.xsl"/>
						</p:input>
					</p:xslt>
				</p:when>
				<p:otherwise>
					<!-- file was not uploaded; display an upload form, for manual testing -->
					<nyingarn:html-page page="reconstitute-tei"/>
				</p:otherwise>
			</p:choose>
		</p:when>
		<p:otherwise>
			<!-- unhandled request: just echo the request back to the client -->
			<p:identity/>	
		</p:otherwise>
	</p:choose>
	<!-- return the result; either an XML file containing TEI surfaces, or a JSON-encoded error -->
	<nyingarn:make-http-response/>
	
	<!-- log the HTTP request -->
	<cx:message name="log-request">
		<p:with-option name="message" select="
			concat(
				'Method [',
				$method,
				'] URI [',
				$uri-path,
				'] returning status code [',
				/c:response/@status,
				'], content type [',
				/c:response/c:body/@content-type,
				']'
			)
		"/>
	</cx:message>
	
	<!-- dump the response -->
	<z:dump href="/tmp/response.xml"/>
</p:declare-step>
