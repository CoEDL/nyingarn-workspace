import "regenerator-runtime";
import { processFtpTeiTranscription, processTeiTranscription, reconstituteTEIFile } from "./transcription-processing";
import path from "path";
import { readdir, remove } from "fs-extra";

describe("Test transcription processing utils", () => {
    it("should be able to process a digivol csv file", async () => {});

    it("should be able to pass a TEI file produced by OxGarage from a DOCX file through an XSLT", async () => {
	await processTeiTranscription({
	    directory: path.join(__dirname, ".."),
	    identifier: "test-data",
	    resource: "msword-example.xml",
	});

	let contents = (await readdir(path.join(__dirname, "..", "test-data"))).sort();
	expect(contents).toContain("FOO-001.tei.xml");
	expect(contents).toContain("FOO-002.tei.xml");
	expect(contents).toContain("FOO-003.tei.xml");
	await remove(path.join(__dirname, "..", "test-data", "FOO-001.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "FOO-002.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "FOO-003.tei.xml"));
    });

    it("should be able to pass a Transkribus file through an XSLT", async () => {
	await processTeiTranscription({
	    directory: path.join(__dirname, ".."),
	    identifier: "test-data",
	    resource: "transkribus-tei.xml",
	});

	let contents = (await readdir(path.join(__dirname, "..", "test-data"))).sort();
	expect(contents).toContain("L17L27-JF1880-1.tei.xml");
	expect(contents).toContain("L17L27-JF1880-2.tei.xml");
	expect(contents).toContain("L17L27-JF1880-3.tei.xml");
	expect(contents).toContain("L17L27-JF1880-4.tei.xml");
	expect(contents).toContain("L17L27-JF1880-5.tei.xml");
	expect(contents).toContain("L17L27-JF1880-6.tei.xml");
	expect(contents).toContain("L17L27-JF1880-7.tei.xml");
	expect(contents).toContain("L17L27-JF1880-8.tei.xml");
	expect(contents).toContain("L17L27-JF1880-9.tei.xml");
	expect(contents).toContain("L17L27-JF1880-10.tei.xml");
	expect(contents).toContain("L17L27-JF1880-11.tei.xml");
	expect(contents).toContain("L17L27-JF1880-12.tei.xml");
	expect(contents).toContain("L17L27-JF1880-13.tei.xml");
	expect(contents).toContain("L17L27-JF1880-14.tei.xml");
	expect(contents).toContain("L17L27-JF1880-15.tei.xml");
	expect(contents).toContain("L17L27-JF1880-16.tei.xml");
	expect(contents).toContain("L17L27-JF1880-17.tei.xml");
	expect(contents).toContain("L17L27-JF1880-18.tei.xml");
	expect(contents).toContain("L17L27-JF1880-19.tei.xml");
	expect(contents).toContain("L17L27-JF1880-20.tei.xml");
	expect(contents).toContain("L17L27-JF1880-21.tei.xml");
	expect(contents).toContain("L17L27-JF1880-22.tei.xml");
	expect(contents).toContain("L17L27-JF1880-23.tei.xml");
	expect(contents).toContain("L17L27-JF1880-24.tei.xml");
	expect(contents).toContain("L17L27-JF1880-25.tei.xml");
	expect(contents).toContain("L17L27-JF1880-26.tei.xml");
	expect(contents).toContain("L17L27-JF1880-27.tei.xml");
	expect(contents).toContain("L17L27-JF1880-28.tei.xml");
	expect(contents).toContain("L17L27-JF1880-29.tei.xml");
	expect(contents).toContain("L17L27-JF1880-30.tei.xml");
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-1.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-2.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-3.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-4.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-5.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-6.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-7.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-8.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-9.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-10.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-11.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-12.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-13.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-14.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-15.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-16.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-17.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-18.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-19.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-20.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-21.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-22.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-23.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-24.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-25.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-26.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-27.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-28.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-29.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "L17L27-JF1880-30.tei.xml"));
    });

	it("should be able to pass an FTP file through an XSLT", async () => {
	await processTeiTranscription({
	    directory: path.join(__dirname, ".."),
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

    it("should be able to pass a hierarchically structured TEI file through an XSLT", async () => {
	await processTeiTranscription({
	    directory: path.join(__dirname, ".."),
	    identifier: "test-data",
	    resource: "structured-tei.xml",
	});
	let contents = (await readdir(path.join(__dirname, "..", "test-data"))).sort();
	expect(contents).toContain("structured-tei-p1.tei.xml");
	expect(contents).toContain("structured-tei-p2.tei.xml");
	expect(contents).toContain("structured-tei-p3.tei.xml");
	expect(contents).toContain("structured-tei-p4.tei.xml");
	expect(contents).toContain("structured-tei-p5.tei.xml");
	expect(contents).toContain("structured-tei-p6.tei.xml");
	expect(contents).toContain("structured-tei-p7.tei.xml");
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p1.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p2.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p3.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p4.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p5.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p6.tei.xml"));
	await remove(path.join(__dirname, "..", "test-data", "structured-tei-p7.tei.xml"));
    });
/*
    it("should be able to process an FTP tei file", async () => {
	await processFtpTeiTranscription({
	    directory: path.join(__dirname, ".."),
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
