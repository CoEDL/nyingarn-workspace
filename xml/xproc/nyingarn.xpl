
<p:declare-step version="1.0" name="nyingarn" xmlns:cx="http://xmlcalabash.com/ns/extensions" xmlns:p="http://www.w3.org/ns/xproc" xmlns:c="http://www.w3.org/ns/xproc-step" xmlns:z="https://github.com/Conal-Tuohy/XProc-Z">
	
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
	
	<p:variable name="uri-path" select="replace(/c:request/@href, 'http://.*?/([^?]*).*', '$1')"/>


	<p:choose>
		<p:when test="$uri-path='nyingarn/ingest-tei'">
			<p:choose>
				<p:when test="//c:body/@disposition[starts-with(., 'form-data; name=&quot;source&quot;')]">
				<!-- upload exists -->
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
				</p:when>
				<p:otherwise>
				<!-- file was not uploaded; display an upload form, for manual testing -->
					<p:identity>
						<p:input port="source">
							<p:inline>
								<html xmlns="http://www.w3.org/1999/xhtml">
									<body>
										<p>Please upload a source file</p>
										<form action="" method="post" enctype="multipart/form-data">
											<input type="text" name="identifier" value="" placeholder="identifier"/>
											<input type="text" name="page-identifier-regex" value=".*\.(jpe?g|tif{1,2}|png|csv|xml)$"/>
											<input type="file" name="source" id="source" accept="application/xml"/>
											<button>Process TEI</button>
										</form>
									</body>
								</html>
							</p:inline>
						</p:input>
					</p:identity>
					<z:make-http-response/>
				</p:otherwise>
			</p:choose>
		</p:when>
		<p:otherwise>
			<p:identity/>	
			<z:make-http-response/>
		</p:otherwise>
	</p:choose>
</p:declare-step>
