import "regenerator-runtime";
import {
    processFtpTeiTranscription,
    __processTeiTranscriptionXMLProcessor,
    reconstituteTEIFile,
} from "./transcription-processing";
import path from "path";
import { readdir, remove } from "fs-extra";

describe("Test transcription processing utils", () => {
    it("should be able to process a digivol csv file", async () => {});

    it("should be able to pass a TEI file produced by OxGarage from a DOCX file through an XSLT", async () => {
        let identifier = "msword_example";
        let resource = "msword_example-tei.xml";
        let expectedFiles = ["msword_example-001.tei.xml", "msword_example-002.tei.xml", "msword_example-003.tei.xml"];
        let unexpectedFiles = ["msword_example_2-001.tei.xml"];
        
        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach(file => expect(contents).toContain(file));
        expectedFiles.forEach(file => remove(path.join(resourceDirectory, file)));
        unexpectedFiles.forEach(file => expect(contents).not.toContain(file));
        unexpectedFiles.forEach(file => remove(path.join(resourceDirectory, file)));
    });

    it("should be able to pass a Transkribus file through an XSLT", async () => {
        let identifier = "L17L27_JF1880";
        let resource = "L17L27_JF1880-tei.xml";
        let expectedFiles = [
        	   "L17L27_JF1880-01.tei.xml", "L17L27_JF1880-02.tei.xml", "L17L27_JF1880-03.tei.xml", "L17L27_JF1880-04.tei.xml", 
            "L17L27_JF1880-05.tei.xml", "L17L27_JF1880-06.tei.xml", "L17L27_JF1880-07.tei.xml", "L17L27_JF1880-08.tei.xml", 
            "L17L27_JF1880-09.tei.xml", "L17L27_JF1880-10.tei.xml", "L17L27_JF1880-11.tei.xml", "L17L27_JF1880-12.tei.xml", 
            "L17L27_JF1880-13.tei.xml", "L17L27_JF1880-14.tei.xml", "L17L27_JF1880-15.tei.xml", "L17L27_JF1880-16.tei.xml", 
            "L17L27_JF1880-17.tei.xml", "L17L27_JF1880-18.tei.xml", "L17L27_JF1880-19.tei.xml", "L17L27_JF1880-20.tei.xml", 
            "L17L27_JF1880-21.tei.xml", "L17L27_JF1880-22.tei.xml", "L17L27_JF1880-23.tei.xml", "L17L27_JF1880-24.tei.xml", 
            "L17L27_JF1880-25.tei.xml", "L17L27_JF1880-26.tei.xml", "L17L27_JF1880-27.tei.xml", "L17L27_JF1880-28.tei.xml", 
            "L17L27_JF1880-29.tei.xml", "L17L27_JF1880-30.tei.xml"
        ];

       await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach(file => expect(contents).toContain(file));
        expectedFiles.forEach(file => remove(path.join(resourceDirectory, file)));
    });

    it("should be able to pass an FTP file through an XSLT", async () => {
        let identifier = "Bates35";
        let resource = "Bates35-tei.xml";
        let expectedFiles = ["Bates35-125T.tei.xml", "Bates35-126T.tei.xml", "Bates35-132T.tei.xml"];

       await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach(file => expect(contents).toContain(file));
        expectedFiles.forEach(file => remove(path.join(resourceDirectory, file)));
    });

    it("should be able to pass a hierarchically structured TEI file through an XSLT", async () => {
        let identifier = "structured";
        let resource = "structured-tei.xml";
        let expectedFiles = [
        	   "structured-01.tei.xml", "structured-02.tei.xml", "structured-03.tei.xml", 
            "structured-04.tei.xml", "structured-05.tei.xml", "structured-06.tei.xml", 
            "structured-07.tei.xml"
        ];
        await __processTeiTranscriptionXMLProcessor({
            directory: path.join(__dirname, "../test-data"),
            identifier: identifier,
            resource: resource,
        });

        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach(file => expect(contents).toContain(file));
        expectedFiles.forEach(file => remove(path.join(resourceDirectory, file)));
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
