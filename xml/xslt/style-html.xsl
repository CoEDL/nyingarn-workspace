<!-- Styles a plain HTML page which forms part of the XML Service's UI -->
<xsl:transform version="3.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:nyingarn="https://nyingarn.net/ns/functions"
	xmlns="http://www.w3.org/1999/xhtml"
	xpath-default-namespace="http://www.w3.org/1999/xhtml"
>
    <xsl:mode on-no-match="shallow-copy"/>
	<xsl:template match="/html">
	    <xsl:copy>
	        <head>
	            <title xsl:expand-text="true">{/html/body/h1}</title>
	            <style type="text/css">
	                body {
	                    font-family: sans-serif;
	                    }
	                a {
	                    text-decoration: none;
	                    }
	                    form {
	                    background-color: #e6e6af;
	                    padding-top: 0.5em;
	                    padding-bottom: 0.5em;
	                    padding-left: 1em;
	                    padding-right: 1em;
	                    }
	                    label {
                                display: block;
                                //font-size: 1.2em;
                                margin-top: 0.8em;
                                margin-bottom: 0.2em;
                            }
                            input[type=text] {
                            display: inline-block;
                            width: 40em;
                            }
                            button, input[type=reset] {
                                display: block;
                                margin-top: 1em;
                                font-size: 1.2em;
                                }

                                input[type=file] {
                                /*
                                    border-style: solid;
                                    border-color: white;
                                    border-with: thin;
                                    */
                                    background-color: white;
                                    margin-top: 0.2em;
                                    margin-bottom: 0.2em;
                                    padding: 0.5em;
                                }
                                header, header a {
                                    background-color: #87876d;
                                    color: white;
                                    padding: 0.5em;
                                    margin: 0;
                                    }
	            </style>
	        </head>
	        <xsl:apply-templates/>
	    </xsl:copy>
	</xsl:template>
	<xsl:template match="body">
	    <xsl:copy>
	        <header><a href="/nyingarn/">Nyingarn XML Web Service</a></header>
	        <xsl:apply-templates/>
	    </xsl:copy>
	</xsl:template>
</xsl:transform>