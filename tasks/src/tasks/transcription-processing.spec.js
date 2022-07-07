import "regenerator-runtime";
import {
    processFtpTeiTranscription,
    __processTeiTranscriptionXMLProcessor,
    __processDigivolTranscriptionXMLProcessor,
    reconstituteTEIFile,
} from "./transcription-processing";
import SaxonJS from "saxon-js";
import path from "path";
import { readdir, remove } from "fs-extra";

jest.setTimeout(20000); // 20s because the CSV processing test is slow

describe("Test transcription processing utils", () => {
    it("should be able to process a digivol csv file", async () => {
        let identifier = "BM1648A91";
        let resource = "BM1648A91-digivol.csv";
        let expectedFiles = [
            "BM1648A91-0001.tei.xml", "BM1648A91-0002.tei.xml", "BM1648A91-0003.tei.xml", "BM1648A91-0004.tei.xml",
            "BM1648A91-0005.tei.xml", "BM1648A91-0006.tei.xml", "BM1648A91-0007.tei.xml", "BM1648A91-0008.tei.xml",
            "BM1648A91-0009.tei.xml", "BM1648A91-0010.tei.xml", "BM1648A91-0011.tei.xml", "BM1648A91-0012.tei.xml",
            "BM1648A91-0013.tei.xml", "BM1648A91-0014.tei.xml", "BM1648A91-0015.tei.xml", "BM1648A91-0016.tei.xml",
            "BM1648A91-0017.tei.xml", "BM1648A91-0018.tei.xml", "BM1648A91-0019.tei.xml", "BM1648A91-0020.tei.xml",
            "BM1648A91-0021.tei.xml", "BM1648A91-0022.tei.xml", "BM1648A91-0023.tei.xml", "BM1648A91-0024.tei.xml",
            "BM1648A91-0025.tei.xml", "BM1648A91-0026.tei.xml"
        ];
        let unexpectedFiles = [
            "BM1648A92-0001.tei.xml", "BM1648A92-0002.tei.xml", "BM1648A92-0003.tei.xml", "BM1648A92-0004.tei.xml", 
            "BM1648A92-0005.tei.xml", "BM1648A92-0006.tei.xml", "BM1648A92-0007.tei.xml", "BM1648A94-0001.tei.xml", 
            "BM1648A94-0002.tei.xml", "BM1648A94-0003.tei.xml", "BM1648A94-0004.tei.xml", "BM1648A94-0005.tei.xml", 
            "BM1648A94-0006.tei.xml", "BM1648A94-0007.tei.xml", "BM1648A94-0008.tei.xml", "BM1648A94-0009.tei.xml", 
            "BM1648A94-0010.tei.xml", "BM1648A94-0011.tei.xml", "BM1648A94-0012.tei.xml", "BM1648A94-0013.tei.xml", 
            "BM1648A94-0014.tei.xml", "BM1648A94-0017.tei.xml", "BM1648A94-0018.tei.xml", "BM1648A94-0019.tei.xml", 
            "BM1648A94-0020.tei.xml", "BM1648A94-0021.tei.xml", "BM1648A94-0022.tei.xml", "BM1648A94-0023.tei.xml", 
            "BM1648A94-0024.tei.xml", "BM1648A94-0025.tei.xml", "BM1648A94-0026.tei.xml", "BM1648A94-0027.tei.xml", 
            "BM1648A95-0001.tei.xml", "BM1648A95-0002.tei.xml", "BM1648A95-0003.tei.xml", "BM1648A95-0004.tei.xml", 
            "BM1648A95-0005.tei.xml", "BM1648A95-0006.tei.xml", "BM1648A95-0007.tei.xml", "BM1648A95-0008.tei.xml", 
            "BM1648A95-0009.tei.xml", "BM1648A96-0001.tei.xml", "BM1648A96-0002.tei.xml", "BM1648A96-0003.tei.xml", 
            "BM1648A96-0004.tei.xml", "BM1648A96-0005.tei.xml", "BM1648A96-0006.tei.xml", "BM1648A96-0007.tei.xml"
        ];
        await __processDigivolTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach((file) => expect(contents).toContain(file));
        expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
        unexpectedFiles.forEach((file) => expect(contents).not.toContain(file));
        unexpectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));    
    });

    it("should be able to pass a TEI file produced by OxGarage from a DOCX file through an XSLT", async () => {
        let identifier = "msword_example";
        let resource = "msword_example-tei.xml";
        let expectedFiles = [
            "msword_example-001.tei.xml",
            "msword_example-002.tei.xml",
            "msword_example-003.tei.xml",
        ];
        let unexpectedFiles = ["msword_example_2-001.tei.xml"];

        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach((file) => expect(contents).toContain(file));
        expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
        unexpectedFiles.forEach((file) => expect(contents).not.toContain(file));
        unexpectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
    });

    it("should be able to strip unwanted text formatting from a TEI file produced by OxGarage from a DOCX file", async () => {
        let identifier = "msword_formatting";
        let resource = "msword_formatting-tei.xml";
        // use TEI as the default namespace so our XPath expressions are more concise
        let options = {"xpathDefaultNamespace": "http://www.tei-c.org/ns/1.0"};

        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let sourceFile = path.join(resourceDirectory, resource);
        let resultFile = path.join(resourceDirectory, "msword_formatting-001.tei.xml");
        // parse the original TEI document and also the derived (single) TEI surface XML file
        let sourceDoc = await SaxonJS.getResource({file: sourceFile, type: "xml"});
        let resultDoc = await SaxonJS.getResource({file: resultFile, type: "xml"});
        // evaluate XPath queries to retrieve lists of items with particular formatting 
        let italicised = SaxonJS.XPath.evaluate("//*[@rend => contains-token('italic')]", resultDoc, options);
        let bold = SaxonJS.XPath.evaluate("//*[@rend => contains-token('bold')]", resultDoc, options);
        let normalStyled = SaxonJS.XPath.evaluate("//*[tokenize(@rend) = 'Normal']", resultDoc, options);
        let underlinedOnly = SaxonJS.XPath.evaluate("//*[@rend = 'underline']", resultDoc, options);
        let struckOutOnly = SaxonJS.XPath.evaluate("//*[@rend = 'strikethrough']", resultDoc, options);
        let underlinedAndStruckOut = SaxonJS.XPath.evaluate("//*[every $token in ('underline', 'strikethrough') satisfies $token = tokenize(@rend)]", resultDoc, options);
        let adjacentIdenticallyFormattedHighlights = SaxonJS.XPath.evaluate(
            "//hi[let $r1:= tokenize(@rend), $r2:= tokenize(following-sibling::node()[1]/self::hi/@rend) return (count($r1) = count($r2)) and (every $r in $r1 satisfies $r = $r2)]/text()", resultDoc, options);
        // Parse the source and result documents into a sequence of tokens consisting of either (a) non-punctuation, non-whitespace, or (b) punctuation characters
        // so that we can compare the two lists.
        // NB the text of the page-identifier is excluded from the source document because we know the ingestion stylesheet is supposed
        // to remove this and convert it into a pb element in the result document.
        let sourceWords = SaxonJS.XPath.evaluate("(for $text in /TEI/text//text()[not(ancestor::hi/@rend='Page')] return analyze-string($text, '[^\\s\\p{P}]+|\\p{P}+')//text()[normalize-space()]) => string-join(' ')", sourceDoc, options);
        let resultWords = SaxonJS.XPath.evaluate("(for $text in /surface//text() return analyze-string($text, '[^\\s\\p{P}]+|\\p{P}+')//text()[normalize-space()]) => string-join(' ')", resultDoc, options);
        // there should be no elements whose @rend contains 'italic' or 'bold' or 'Normal'
        expect(italicised).toBeNull();
        expect(bold).toBeNull();
        expect(normalStyled).toBeNull();
        // every set of adjacent identically-formatted highlights should have been merged into a single highlight
        expect(adjacentIdenticallyFormattedHighlights).toBeNull();
        // there should be elements which are just underlined, elements which are just strikethrough, and some which are both
        expect(underlinedOnly).not.toBeNull();
        expect(struckOutOnly).not.toBeNull();
        expect(underlinedAndStruckOut).not.toBeNull();
        // the full textual content (ignoring white space) of the source document should be preserved in the result document
        expect(sourceWords).toEqual(resultWords);
        
        // delete the result document
        remove(resultFile);
    });

    it("should be able to pass a Transkribus file through an XSLT", async () => {
        let identifier = "L17L27_JF1880";
        let resource = "L17L27_JF1880-tei.xml";
        let expectedFiles = [
            "L17L27_JF1880-01.tei.xml",
            "L17L27_JF1880-02.tei.xml",
            "L17L27_JF1880-03.tei.xml",
            "L17L27_JF1880-04.tei.xml",
            "L17L27_JF1880-05.tei.xml",
            "L17L27_JF1880-06.tei.xml",
            "L17L27_JF1880-07.tei.xml",
            "L17L27_JF1880-08.tei.xml",
            "L17L27_JF1880-09.tei.xml",
            "L17L27_JF1880-10.tei.xml",
            "L17L27_JF1880-11.tei.xml",
            "L17L27_JF1880-12.tei.xml",
            "L17L27_JF1880-13.tei.xml",
            "L17L27_JF1880-14.tei.xml",
            "L17L27_JF1880-15.tei.xml",
            "L17L27_JF1880-16.tei.xml",
            "L17L27_JF1880-17.tei.xml",
            "L17L27_JF1880-18.tei.xml",
            "L17L27_JF1880-19.tei.xml",
            "L17L27_JF1880-20.tei.xml",
            "L17L27_JF1880-21.tei.xml",
            "L17L27_JF1880-22.tei.xml",
            "L17L27_JF1880-23.tei.xml",
            "L17L27_JF1880-24.tei.xml",
            "L17L27_JF1880-25.tei.xml",
            "L17L27_JF1880-26.tei.xml",
            "L17L27_JF1880-27.tei.xml",
            "L17L27_JF1880-28.tei.xml",
            "L17L27_JF1880-29.tei.xml",
            "L17L27_JF1880-30.tei.xml",
        ];

        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach((file) => expect(contents).toContain(file));
        expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
    });

    it("should be able to pass an FTP file through an XSLT", async () => {
        let identifier = "Bates35";
        let resource = "Bates35-tei.xml";
        let expectedFiles = [
            "Bates35-125T.tei.xml",
            "Bates35-126T.tei.xml",
            "Bates35-132T.tei.xml",
        ];

        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach((file) => expect(contents).toContain(file));
        expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
    });

    it.only("should be able to split a hierarchically structured TEI file into surface files and then reconstitute it", async () => {
        let identifier = "structured";
        let resource = "structured-tei.xml";
        let expectedFiles = [
            "structured-01.tei.xml",
            "structured-02.tei.xml",
            "structured-03.tei.xml",
            "structured-04.tei.xml",
            "structured-05.tei.xml",
            "structured-06.tei.xml",
            "structured-07.tei.xml",
        ];
        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });

        //TODO reconstitute the file and validate it
        await reconstituteTEIFile({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        
        // Validate splitting of TEI into <surface> files
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach((file) => expect(contents).toContain(file));
        
        // Validate reconstitution of TEI doc from <surface> files
        // TODO what kinds of validation?
        // it should contain all the text of the original file
        // it should not have any @part (etc) markup on <div> elements
        // it should contain the supplied teiHeader metadata
        
        // clean up
        // TODO uncomment and re-enable clean up
        //expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));

    });

    it("should fail to ingest mackenzie-tei.xml as it contains no valid pages", async () => {
        let identifier = "mackenzie";
        let resource = "mackenzie-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory: path.join(__dirname, "../test-data"),
                identifier: identifier,
                resource: resource,
            });
            throw new Error("Stylesheet failed to throw an error!");
        } catch (error) {
            expect(error.message).toMatch("ERROR: no pages with suitable identifiers");
        }
    });

    it("should fail to ingest unpaginated-tei.xml as it contains no page breaks", async () => {
        let identifier = "unpaginated";
        let resource = "unpaginated-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory: path.join(__dirname, "../test-data"),
                identifier: identifier,
                resource: resource,
            });
            throw new Error("Stylesheet failed to throw an error!");
        } catch (error) {
            expect(error.message).toMatch("ERROR: unpaginated document");
        }
    });

    it("should fail to ingest Bates34-tei.xml as it contains duplicated page identifiers", async () => {
        let identifier = "Bates34";
        let resource = "Bates34-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory: path.join(__dirname, "../test-data"),
                identifier: identifier,
                resource: resource,
            });
            throw new Error("Stylesheet failed to throw the expected error!");
        } catch (error) {
            expect(error.message).toMatch(/ERROR:.*Bates34-023/);
            expect(error.message).toMatch(/ERROR:.*Bates34-025/);
            expect(error.message).toMatch(/ERROR:.*Bates34-048/);
            expect(error.message).toMatch(/ERROR:.*Bates34-066/);
            expect(error.message).toMatch(/ERROR:.*Bates34-100/);
        }
    });

    /*
    it("should be able to process an FTP tei file", async () => {
	await processFtpTeiTranscription({
	    directory: path.join(__dirname, "../test-data"),
            identifier: "test-data",
            resource: "ftp-tei.xml",
        });

        let contents = (await readdir(path.join(__dirname, "..", "test-data"))).sort();
        expect(contents).toContain("Bates35-125T.tei.xml");
        expect(contents).toContain("Bates35-126T.tei.xml");
        expect(contents).toContain("Bates35-132T.tei.xml");
        await remove(path.join(__dirname, "..", "test-data", "Bates35-125T.tei.xml"));
        await remove(path.join(__dirname, "..", "test-data", "Bates35-126T.tei.xml"));
        await remove(path.join(__dirname, "..", "test-data", "Bates35-132T.tei.xml"));
    });
*/
});
