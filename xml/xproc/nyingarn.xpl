
<p:declare-step version="1.0" name="nyingarn" 
	xmlns:cx="http://xmlcalabash.com/ns/extensions" 
	xmlns:p="http://www.w3.org/ns/xproc" 
	xmlns:c="http://www.w3.org/ns/xproc-step" 
	xmlns:z="https://github.com/Conal-Tuohy/XProc-Z"
	xmlns:fn="http://www.w3.org/2005/xpath-functions"
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
	
	<p:declare-step name="home-page" type="nyingarn:home-page">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:identity>
			<p:input port="source">
				<p:inline>
					<html xmlns="http://www.w3.org/1999/xhtml">
						<body>
							<h1>Nyingarn XML-processing web service</h1>
							<ul>
								<li><a href="ingest-tei">Ingest TEI</a></li>
								<li><a href="ingest-json">Ingest JSON (previously converted from CSV)</a></li>
								<li><a href="reconstitute-tei">Reconstitute a TEI document from an RO-Crate metadata file and a set of TEI surface files</a></li>
								<li><a href="validate-with-schematron">Validate an XML document with a Schematron schema</a></li>
							</ul>
						</body>
					</html>
				</p:inline>
			</p:input>
		</p:identity>
	</p:declare-step>

	<p:declare-step name="validate-with-schematron-form" type="nyingarn:validate-with-schematron-form">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:identity>
			<p:input port="source">
				<p:inline>
					<html xmlns="http://www.w3.org/1999/xhtml">
						<body>
							<p>Please upload one or two instance documents and a Schematron schema</p>
							<p>If you upload two documents, they will each be wrapped in 
							<code>&lt;c:file xmlns:c="http://www.w3.org/ns/xproc-step"&gt;</code>
							elements and these two <code>c:file</code> elements will themselves be wrapped in a root 
							<code>c:directory</code> element, which will be passed to the Schematron validator.</p>
							<p>If you upload a single document, it will be validated as is.</p> 
							<form action="" method="post" enctype="multipart/form-data" accept-charset="utf-8">
								<input type="hidden" name="_charset_" value="utf-8"/>
								<input type="file" name="instance" accept="application/xml"/>
								<input type="file" name="instance" accept="application/xml"/>
								<input type="file" name="schema" id="schema" accept="application/xml"/>
								<button>Validate with Schematron</button>
							</form>
						</body>
					</html>
				</p:inline>
			</p:input>
		</p:identity>
	</p:declare-step>
	
	
	<p:declare-step name="ingest-json-form" type="nyingarn:ingest-json-form">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:identity>
			<p:input port="source">
				<p:inline>
					<html xmlns="http://www.w3.org/1999/xhtml">
						<body>
							<p>Please upload a JSON source file</p>
							<form action="" method="post" enctype="multipart/form-data" accept-charset="utf-8">
								<input type="hidden" name="_charset_" value="utf-8"/>
								<input type="text" name="identifier" value="" placeholder="identifier"/>
								<input type="text" name="page-identifier-regex" value=".*\.(jpe?g|tif{1,2}|png|csv|xml)$"/>
								<input type="file" name="source" id="source" accept="application/json"/>
								<button>Get TEI surfaces</button>
							</form>
						</body>
					</html>
				</p:inline>
			</p:input>
		</p:identity>
	</p:declare-step>
	
	<p:declare-step name="ingest-tei-form" type="nyingarn:ingest-tei-form">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:identity>
			<p:input port="source">
				<p:inline>
					<html xmlns="http://www.w3.org/1999/xhtml">
						<body>
							<p>Please upload a source TEI XML file</p>
							<form action="" method="post" enctype="multipart/form-data" accept-charset="utf-8">
								<input type="text" name="identifier" value="" placeholder="identifier"/>
								<input type="text" name="page-identifier-regex" value=".*\.(jpe?g|tif{1,2}|png|csv|xml)$"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<button>Get TEI surfaces</button>
							</form>
						</body>
					</html>
				</p:inline>
			</p:input>
		</p:identity>
	</p:declare-step>
	
	<p:declare-step name="reconstitute-tei-form" type="nyingarn:reconstitute-tei-form">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:identity>
			<p:input port="source">
				<p:inline>
					<html xmlns="http://www.w3.org/1999/xhtml">
						<body>
							<p>Please upload a set of TEI surface files to reconstitute them into a single TEI file</p>
							<form action="" method="post" enctype="multipart/form-data" accept-charset="utf-8">
								<input type="hidden" name="_charset_" value="utf-8"/>
								<input type="text" name="identifier" value="" placeholder="identifier"/>
								<input type="text" name="page-identifier-regex" value=".*\.(jpe?g|tif{1,2}|png|csv|xml)$"/>
								<input type="file" name="ro-crate" id="source" accept="application/json"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<input type="file" name="source" id="source" accept="application/xml"/>
								<button>Reconstitute a single TEI file</button>
							</form>
						</body>
					</html>
				</p:inline>
			</p:input>
		</p:identity>
	</p:declare-step>
	<!-- 
		Package the source XML into an HTTP response:
		If it's JSON-XML, regard it as an error: convert it to JSON and return it with an HTTP 400 error code.
		If it's other XML, regard it as a success: return it as XML with a 200 OK
	-->
	<p:declare-step name="make-http-response" type="nyingarn:make-http-response">
		<p:input port="source"/>
		<p:output port="result"/>
		<p:choose>
			<p:when test="/fn:map" xmlns:fn="http://www.w3.org/2005/xpath-functions"><!-- an error -->
				<p:template name="http-response">
					<p:input port="parameters"><p:empty/></p:input>
					<p:input port="template">
						<p:inline>
							<c:response status="400">
								<c:body content-type="application/json">{xml-to-json(/*)}</c:body>
							</c:response>
						</p:inline>
					</p:input>
				</p:template>
			</p:when>
			<p:otherwise><!-- TEI -->
				<z:make-http-response/>
			</p:otherwise>
		</p:choose>
	</p:declare-step>
	
	<p:variable name="uri-path" select="replace(/c:request/@href, 'http://.*?/([^?]*).*', '$1')"/>
	
	<z:dump href="/tmp/request.xml"/>

	<!-- route HTTP request to the relevant sub-pipeline -->
	<p:choose>
		<p:when test="$uri-path='nyingarn/'">
			<nyingarn:home-page/>
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
					<nyingarn:validate-with-schematron-form/>
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
					<nyingarn:ingest-tei-form/>
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
					<nyingarn:ingest-json-form/>
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
					<nyingarn:reconstitute-tei-form/>
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
				'Request URI [',
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
