import "regenerator-runtime";
import {
    processFtpTeiTranscription,
    __processTeiTranscriptionXMLProcessor,
    __processDigivolTranscriptionXMLProcessor,
    reconstituteTEIFile,
} from "./transcription-processing";
import {
	makeScratchDirectory,
	validateWithSchematron
} from "./testing";
import path from "path";
import { readdir, remove, ensureDir, pathExists, copy } from "fs-extra";
import { prepare, cleanup } from "./index.js";
import { pathToFileURL } from "node:url";

jest.setTimeout(20000); // 20s because some tests are too slow otherwise

async function makeScratchCopy(testDataFolder, testCode = "test") {
    // The testDataFolder parameter specifies a folder path relative to the "test-data" folder.
    // This function makes a temporary copy of that specific folder outside of the source
    // code tree and returns the full path of that temporary folder.
    const sourceFolder = path.join(__dirname, "../test-data/", testDataFolder);
    // the optional testCode parameter is used to disambiguate tests which work with the same source data
    // since the tests may run simultaneously, creating and deleting files in the scratch directory, and
    // negating the independence of the tests
    const scratchFolder = path.join("/tmp/test-data/", testDataFolder.replaceAll("/", "_") + '-' + testCode);
    await ensureDir(scratchFolder);
    await copy(sourceFolder, scratchFolder);
    return scratchFolder;
}

async function removeScratchDirectory(directory) {
	//await remove(directory);
}

describe(`Check that known good files are processed successfully`, () => {
    let log, warn;
    beforeAll(() => {
        log = jest.spyOn(console, "log").mockImplementation(() => {});
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
        warn.mockReset();
        log.mockReset();
    });
    it("BM1648A91 - should be able to process a digivol csv file", async () => {
        let identifier = "BM1648A91";
        const directory = await makeScratchCopy("Succeeds-digivol-upload/BM1648A91");
        let resource = "BM1648A91-digivol.csv";
        let expectedFiles = [
            "BM1648A91-0001.tei.xml",
            "BM1648A91-0002.tei.xml",
            "BM1648A91-0003.tei.xml",
            "BM1648A91-0004.tei.xml",
            "BM1648A91-0005.tei.xml",
            "BM1648A91-0006.tei.xml",
            "BM1648A91-0007.tei.xml",
            "BM1648A91-0008.tei.xml",
            "BM1648A91-0009.tei.xml",
            "BM1648A91-0010.tei.xml",
            "BM1648A91-0011.tei.xml",
            "BM1648A91-0012.tei.xml",
            "BM1648A91-0013.tei.xml",
            "BM1648A91-0014.tei.xml",
            "BM1648A91-0015.tei.xml",
            "BM1648A91-0016.tei.xml",
            "BM1648A91-0017.tei.xml",
            "BM1648A91-0018.tei.xml",
            "BM1648A91-0019.tei.xml",
            "BM1648A91-0020.tei.xml",
            "BM1648A91-0021.tei.xml",
            "BM1648A91-0022.tei.xml",
            "BM1648A91-0023.tei.xml",
            "BM1648A91-0024.tei.xml",
            "BM1648A91-0025.tei.xml",
            "BM1648A91-0026.tei.xml",
        ];
        let unexpectedFiles = [
            "BM1648A92-0001.tei.xml",
            "BM1648A92-0002.tei.xml",
            "BM1648A92-0003.tei.xml",
            "BM1648A92-0004.tei.xml",
            "BM1648A92-0005.tei.xml",
            "BM1648A92-0006.tei.xml",
            "BM1648A92-0007.tei.xml",
            "BM1648A94-0001.tei.xml",
            "BM1648A94-0002.tei.xml",
            "BM1648A94-0003.tei.xml",
            "BM1648A94-0004.tei.xml",
            "BM1648A94-0005.tei.xml",
            "BM1648A94-0006.tei.xml",
            "BM1648A94-0007.tei.xml",
            "BM1648A94-0008.tei.xml",
            "BM1648A94-0009.tei.xml",
            "BM1648A94-0010.tei.xml",
            "BM1648A94-0011.tei.xml",
            "BM1648A94-0012.tei.xml",
            "BM1648A94-0013.tei.xml",
            "BM1648A94-0014.tei.xml",
            "BM1648A94-0017.tei.xml",
            "BM1648A94-0018.tei.xml",
            "BM1648A94-0019.tei.xml",
            "BM1648A94-0020.tei.xml",
            "BM1648A94-0021.tei.xml",
            "BM1648A94-0022.tei.xml",
            "BM1648A94-0023.tei.xml",
            "BM1648A94-0024.tei.xml",
            "BM1648A94-0025.tei.xml",
            "BM1648A94-0026.tei.xml",
            "BM1648A94-0027.tei.xml",
            "BM1648A95-0001.tei.xml",
            "BM1648A95-0002.tei.xml",
            "BM1648A95-0003.tei.xml",
            "BM1648A95-0004.tei.xml",
            "BM1648A95-0005.tei.xml",
            "BM1648A95-0006.tei.xml",
            "BM1648A95-0007.tei.xml",
            "BM1648A95-0008.tei.xml",
            "BM1648A95-0009.tei.xml",
            "BM1648A96-0001.tei.xml",
            "BM1648A96-0002.tei.xml",
            "BM1648A96-0003.tei.xml",
            "BM1648A96-0004.tei.xml",
            "BM1648A96-0005.tei.xml",
            "BM1648A96-0006.tei.xml",
            "BM1648A96-0007.tei.xml",
        ];

        try {
            await __processDigivolTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
            unexpectedFiles.forEach(file => expect(contents).not.toContainEqual(file));
        } catch (error) {
            throw error;
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("NewNorcia38c - should be able to process a digivol csv file", async () => {
        let identifier = "NewNorcia38c";
        const directory = await makeScratchCopy("Issue-digivol_upload_failure/NewNorcia38c");
        let resource = "NewNorcia38c-digivol.csv";
        let expectedFiles = [
            "NewNorcia38c-4000.tei.xml",
            "NewNorcia38c-4001.tei.xml",
            "NewNorcia38c-4002.tei.xml",
            "NewNorcia38c-4003.tei.xml",
            "NewNorcia38c-4004.tei.xml",
            "NewNorcia38c-4005.tei.xml",
            "NewNorcia38c-4006.tei.xml",
            "NewNorcia38c-4007.tei.xml",
            "NewNorcia38c-4008.tei.xml",
            "NewNorcia38c-4009.tei.xml",
            "NewNorcia38c-4010.tei.xml",
            "NewNorcia38c-4011.tei.xml",
            "NewNorcia38c-4012.tei.xml",
            "NewNorcia38c-4013.tei.xml",
            "NewNorcia38c-4014.tei.xml",
            "NewNorcia38c-4015.tei.xml",
            "NewNorcia38c-4016.tei.xml",
            "NewNorcia38c-4017.tei.xml",
            "NewNorcia38c-4018.tei.xml",
            "NewNorcia38c-4019.tei.xml",
            "NewNorcia38c-4020.tei.xml",
            "NewNorcia38c-4021.tei.xml",
            "NewNorcia38c-4022.tei.xml",
            "NewNorcia38c-4023.tei.xml",
            "NewNorcia38c-4024.tei.xml",
            "NewNorcia38c-4025.tei.xml",
            "NewNorcia38c-4026.tei.xml",
            "NewNorcia38c-4027.tei.xml",
            "NewNorcia38c-4028.tei.xml",
            "NewNorcia38c-4029.tei.xml",
            "NewNorcia38c-4030.tei.xml",
            "NewNorcia38c-4031.tei.xml",
            "NewNorcia38c-4032.tei.xml",
            "NewNorcia38c-4033.tei.xml",
            "NewNorcia38c-4034.tei.xml",
            "NewNorcia38c-4035.tei.xml",
            "NewNorcia38c-4036.tei.xml",
            "NewNorcia38c-4037.tei.xml",
            "NewNorcia38c-4038.tei.xml",
            "NewNorcia38c-4039.tei.xml",
            "NewNorcia38c-4040.tei.xml",
            "NewNorcia38c-4042.tei.xml",
            "NewNorcia38c-4043.tei.xml",
            "NewNorcia38c-4045.tei.xml",
            "NewNorcia38c-4046.tei.xml",
            "NewNorcia38c-4047.tei.xml",
            "NewNorcia38c-4048.tei.xml",
            "NewNorcia38c-4049.tei.xml",
            "NewNorcia38c-4050.tei.xml",
            "NewNorcia38c-4051.tei.xml",
            "NewNorcia38c-4052.tei.xml",
            "NewNorcia38c-4053.tei.xml",
            "NewNorcia38c-4054.tei.xml",
            "NewNorcia38c-4055.tei.xml",
            "NewNorcia38c-4056.tei.xml",
            "NewNorcia38c-4065.tei.xml",
            "NewNorcia38c-4066.tei.xml",
            "NewNorcia38c-4067.tei.xml",
            "NewNorcia38c-4068.tei.xml",
            "NewNorcia38c-4070.tei.xml",
            "NewNorcia38c-4071.tei.xml",
            "NewNorcia38c-4072.tei.xml",
        ];

        try {
            await __processDigivolTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();

            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } catch (error) {
            throw error;
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("fake-msword-example - should be able to pass a TEI file produced by OxGarage from a DOCX file through an XSLT", async () => {
        let identifier = "msword_example";
        let resource = "msword_example-tei.xml";
        let directory = await makeScratchCopy("Succeeds-word_doc_upload/fake-msword-example");
        let expectedFiles = [
            "msword_example-001.tei.xml",
            "msword_example-002.tei.xml",
            "msword_example-003.tei.xml",
        ];
        let unexpectedFiles = ["msword_example_2-001.tei.xml"];

        try {
            try {
                await __processTeiTranscriptionXMLProcessor({
                    directory,
                    identifier,
                    resource,
                });
            } catch (error) {
                throw error;
            }
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
            unexpectedFiles.forEach(file => expect(contents).not.toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("SLNSW_FL814 - should be able to pass a TEI file produced by OxGarage from a DOCX file through an XSLT", async () => {
        let identifier = "SLNSW_FL814";
        let resource = "SLNSW_FL814-tei.xml";
        let directory = await makeScratchCopy("Succeeds-word_doc_upload/SLNSW_FL814");

        let expectedFiles = ["SLNSW_FL814-357.tei.xml"];

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("L17L27_JF1880 - should be able to pass a Transkribus file through an XSLT", async () => {
        let identifier = "L17L27_JF1880";
        let resource = "L17L27_JF1880-tei.xml";
        let directory = await makeScratchCopy("transkribus-ingestion/L17L27_JF1880", "ingest-transcribus");
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

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory));//.sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("L17L27 - should be able to pass a Transkribus file through an XSLT", async () => {
        let identifier = "L17L27";
        let resource = "L17L27-tei.xml";
        let directory = await makeScratchCopy("transkribus-ingestion/L17L27", "ingest-transcribus");
        let expectedFiles = [
            "L17L27-01.tei.xml",
            "L17L27-02.tei.xml",
            "L17L27-03.tei.xml",
            "L17L27-04.tei.xml",
            "L17L27-05.tei.xml",
            "L17L27-06.tei.xml",
            "L17L27-07.tei.xml",
            "L17L27-08.tei.xml",
            "L17L27-09.tei.xml",
            "L17L27-10.tei.xml",
            "L17L27-11.tei.xml",
            "L17L27-12.tei.xml",
            "L17L27-13.tei.xml",
            "L17L27-14.tei.xml",
            "L17L27-15.tei.xml",
            "L17L27-16.tei.xml",
            "L17L27-17.tei.xml",
            "L17L27-18.tei.xml",
            "L17L27-19.tei.xml",
            "L17L27-20.tei.xml",
            "L17L27-21.tei.xml",
            "L17L27-22.tei.xml",
            "L17L27-23.tei.xml",
            "L17L27-24.tei.xml",
            "L17L27-25.tei.xml",
            "L17L27-26.tei.xml",
            "L17L27-27.tei.xml",
            "L17L27-28.tei.xml",
            "L17L27-29.tei.xml",
            "L17L27-30.tei.xml",
        ];

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("Bates35 - should be able to pass an FTP file through an XSLT", async () => {
        let identifier = "Bates35";
        let resource = "Bates35-tei.xml";
        let directory = await makeScratchCopy("Succeeds-ftp-upload/Bates35", "ingest-ftp");
        let expectedFiles = [
            "Bates35-125T.tei.xml",
            "Bates35-126T.tei.xml",
            "Bates35-132T.tei.xml",
        ];

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("Bates34 - should be able to pass an FTP file through an XSLT", async () => {
        let identifier = "Bates34";
        let resource = "Bates34-tei.xml";
        let directory = await makeScratchCopy("Succeeds-ftp-upload/Bates34", "ingest-ftp");
        let expectedFiles = ["Bates34-1aT.tei.xml", "Bates34-1bT.tei.xml", "Bates34-2T.tei.xml"];
        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("structured - should be able to pass a hierarchically structured TEI file through an XSLT", async () => {
        let identifier = "structured";
        let resource = "structured-tei.xml";
        let directory = await makeScratchCopy("tei-div-hierarchy-splitting/structured");
        let expectedFiles = [
            "structured-01.tei.xml",
            "structured-02.tei.xml",
            "structured-03.tei.xml",
            "structured-04.tei.xml",
            "structured-05.tei.xml",
            "structured-06.tei.xml",
            "structured-07.tei.xml",
        ];

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });

            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
});
describe(`Confirm file extensions are removed`, () => {
    let log, warn;
    beforeAll(() => {
        log = jest.spyOn(console, "log").mockImplementation(() => {});
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
        warn.mockReset();
        log.mockReset();
    });

    it("should ingest a TEI file produced by OxGarage from a DOCX file, stripping extensions from page identifiers", async () => {
        let identifier = "c018660";
        let directory = await makeScratchCopy("word-page-identifiers-with-extensions/c018660", "ingest-docx");
        // This document contains page-identifiers which include a ".jpg" extension. This test validates that the output files have
        // the extension ".tei.xml" rather than ".jpg.tei.xml"
        let resource = "c018660-tei.xml";
        let expectedFiles = [
            "c018660-004h.tei.xml",
            "c018660-006h.tei.xml",
            "c018660-007h.tei.xml",
            "c018660-008h.tei.xml",
            "c018660-009h.tei.xml",
            "c018660-010h.tei.xml",
            "c018660-011h.tei.xml",
            "c018660-012h.tei.xml",
            "c018660-013h.tei.xml",
            "c018660-014h.tei.xml",
            "c018660-015h.tei.xml",
            "c018660-016h.tei.xml",
            "c018660-017h.tei.xml",
            "c018660-018h.tei.xml",
            "c018660-019h.tei.xml",
            "c018660-020h.tei.xml",
            "c018660-021h.tei.xml",
            "c018660-022h.tei.xml",
            "c018660-023h.tei.xml",
            "c018660-024h.tei.xml",
            "c018660-025h.tei.xml",
            "c018660-026h.tei.xml",
            "c018660-027h.tei.xml",
            "c018660-028h.tei.xml",
            "c018660-029h.tei.xml",
            "c018660-030h.tei.xml",
            "c018660-031h.tei.xml",
            "c018660-032h.tei.xml",
            "c018660-033h.tei.xml",
            "c018660-034h.tei.xml",
            "c018660-035h.tei.xml",
            "c018660-036h.tei.xml",
            "c018660-037h.tei.xml",
            "c018660-038h.tei.xml",
            "c018660-039h.tei.xml",
            "c018660-040h.tei.xml",
            "c018660-041h.tei.xml",
            "c018660-042h.tei.xml",
            "c018660-043h.tei.xml",
            "c018660-044h.tei.xml",
            "c018660-045h.tei.xml",
            "c018660-046h.tei.xml",
            "c018660-047h.tei.xml",
            "c018660-048h.tei.xml",
            "c018660-049h.tei.xml",
            "c018660-050h.tei.xml",
            "c018660-051h.tei.xml",
            "c018660-052h.tei.xml",
            "c018660-053h.tei.xml",
            "c018660-054h.tei.xml",
            "c018660-055h.tei.xml",
            "c018660-056h.tei.xml",
            "c018660-057h.tei.xml",
            "c018660-058h.tei.xml",
            "c018660-059h.tei.xml",
            "c018660-060h.tei.xml",
            "c018660-061h.tei.xml",
            "c018660-062h.tei.xml",
            "c018660-063h.tei.xml",
            "c018660-064h.tei.xml",
            "c018660-065h.tei.xml",
            "c018660-066h.tei.xml",
            "c018660-067h.tei.xml",
            "c018660-068h.tei.xml",
            "c018660-069h.tei.xml",
            "c018660-070h.tei.xml",
            "c018660-071h.tei.xml",
            "c018660-072h.tei.xml",
            "c018660-073h.tei.xml",
            "c018660-074h.tei.xml",
            "c018660-075h.tei.xml",
            "c018660-076h.tei.xml",
            "c018660-077h.tei.xml",
            "c018660-078h.tei.xml",
            "c018660-079h.tei.xml",
            "c018660-080h.tei.xml",
            "c018660-081h.tei.xml",
            "c018660-082h.tei.xml",
            "c018660-084h.tei.xml",
            "c018660-085h.tei.xml",
            "c018660-086h.tei.xml",
            "c018660-087h.tei.xml",
            "c018660-088h.tei.xml",
            "c018660-089h.tei.xml",
            "c018660-090h.tei.xml",
            "c018660-091h.tei.xml",
            "c018660-092h.tei.xml",
            "c018660-093h.tei.xml",
            "c018660-094h.tei.xml",
            "c018660-095h.tei.xml",
            "c018660-096h.tei.xml",
            "c018660-097h.tei.xml",
            "c018660-098h.tei.xml",
            "c018660-099h.tei.xml",
            "c018660-100h.tei.xml",
            "c018660-101h.tei.xml",
            "c018660-102h.tei.xml",
            "c018660-103h.tei.xml",
            "c018660-104h.tei.xml",
            "c018660-105h.tei.xml",
            "c018660-106h.tei.xml",
            "c018660-107h.tei.xml",
            "c018660-108h.tei.xml",
            "c018660-109h.tei.xml",
            "c018660-110h.tei.xml",
            "c018660-111h.tei.xml",
            "c018660-112h.tei.xml",
            "c018660-113h.tei.xml",
            "c018660-114h.tei.xml",
            "c018660-115h.tei.xml",
            "c018660-116h.tei.xml",
            "c018660-117h.tei.xml",
            "c018660-118h.tei.xml",
            "c018660-119h.tei.xml",
            "c018660-120h.tei.xml",
            "c018660-121h.tei.xml",
            "c018660-122h.tei.xml",
            "c018660-123h.tei.xml",
            "c018660-124h.tei.xml",
            "c018660-125h.tei.xml",
            "c018660-126h.tei.xml",
            "c018660-127h.tei.xml",
            "c018660-128h.tei.xml",
            "c018660-129h.tei.xml",
            "c018660-130h.tei.xml",
            "c018660-131h.tei.xml",
            "c018660-132h.tei.xml",
            "c018660-133h.tei.xml",
            "c018660-134h.tei.xml",
            "c018660-135h.tei.xml",
            "c018660-136h.tei.xml",
            "c018660-137h.tei.xml",
            "c018660-138h.tei.xml",
            "c018660-139h.tei.xml",
            "c018660-140h.tei.xml",
            "c018660-141h.tei.xml",
            "c018660-142h.tei.xml",
            "c018660-143h.tei.xml",
            "c018660-144h.tei.xml",
            "c018660-145h.tei.xml",
            "c018660-146h.tei.xml",
            "c018660-147h.tei.xml",
            "c018660-148h.tei.xml",
            "c018660-149h.tei.xml",
            "c018660-150h.tei.xml",
            "c018660-151h.tei.xml",
            "c018660-152h.tei.xml",
            "c018660-153h.tei.xml",
            "c018660-159h.tei.xml",
            "c018660-160h.tei.xml",
            "c018660-161h.tei.xml",
            "c018660-162h.tei.xml",
            "c018660-163h.tei.xml",
            "c018660-164h.tei.xml",
            "c018660-165h.tei.xml",
            "c018660-166h.tei.xml",
            "c018660-167h.tei.xml",
            "c018660-168h.tei.xml",
            "c018660-169h.tei.xml",
            "c018660-170h.tei.xml",
            "c018660-171h.tei.xml",
            "c018660-172h.tei.xml",
            "c018660-173h.tei.xml",
            "c018660-174h.tei.xml",
            "c018660-175h.tei.xml",
            "c018660-176h.tei.xml",
            "c018660-177h.tei.xml",
            "c018660-178h.tei.xml",
            "c018660-179h.tei.xml",
        ];

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            let contents = (await readdir(directory)).sort();
            expectedFiles.forEach(file => expect(contents).toContainEqual(file));
        } finally {
            await removeScratchDirectory(directory);
        }
    });
});
describe(`Confirm non-UTF-8-encoding of DigiVol CSV file is rejected`, () => {
    let log, warn;
    beforeAll(() => {
        log = jest.spyOn(console, "log").mockImplementation(() => {});
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
        warn.mockReset();
        log.mockReset();
    });
    it("should ingest BM1648A91-digivol.csv even though it's not encoded in UTF-8", async () => {
        let identifier = "BM1648A91";
        let directory = await makeScratchCopy("Issue-digivol_upload_failure/BM1648A91");
        let resource = "BM1648A91-digivol.csv";
        // apparently there's a regression somewhere in the stack underlying the CSV Parser or createReadStream which is
        // now correctly recognising the ISO-8859-1 encoding of the source CSV file and transcoding it.
        try {
            await __processDigivolTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
        } finally {
            await removeScratchDirectory(directory);
        }
    });
});

describe(`Confirm malformed XML is rejected`, () => {
    let log, warn;
    beforeAll(() => {
        log = jest.spyOn(console, "log").mockImplementation(() => {});
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
        warn.mockReset();
        log.mockReset();
    });
    it("should fail to ingest Grey_g_12_c_12-tei.xml as it's not well-formed XML", async () => {
        let identifier = "Grey_g_12_c_12";
        let directory = await makeScratchCopy("Issue-tei_did_not_upload/Grey_g_12_c_12");
        let resource = "Grey_g_12_c_12-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            throw new Error("Stylesheet failed to throw an error!");
        } catch (error) {
            expect(error.name).toBe("MalformedXMLFile");
        } finally {
            await removeScratchDirectory(directory);
        }
    });
});
describe(`Confirm no valid pages found`, () => {
    it("should fail to ingest mackenzie-tei.xml as it contains no valid pages", async () => {
        let identifier = "mackenzie";
        let directory = await makeScratchCopy("ftp-invalid-page-identifiers/mackenzie");
        let resource = "mackenzie-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            throw new Error("Stylesheet failed to throw an error!");
        } catch (error) {
            expect(error.name).toBe("NoPagesWithSuitableIdentifiers");
            expect(error.cause["document-identifier"]).toBe(identifier);
            expect(error.message).toMatch(identifier);
        } finally {
            await removeScratchDirectory(directory);
        }
    });

    it("should fail to ingest unpaginated-tei.xml as it contains no page breaks", async () => {
        let identifier = "unpaginated";
        let directory = await makeScratchCopy("unpaginated-tei/unpaginated");
        let resource = "unpaginated-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            throw new Error("Stylesheet failed to throw an error!");
        } catch (error) {
            expect(error.name).toBe("UnpaginatedDocument");
        } finally {
            await removeScratchDirectory(directory);
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
        expect(contents).toContainEqual("Bates35-125T.tei.xml");
        expect(contents).toContainEqual("Bates35-126T.tei.xml");
        expect(contents).toContainEqual("Bates35-132T.tei.xml");
        await remove(path.join(__dirname, "..", "test-data", "Bates35-125T.tei.xml"));
        await remove(path.join(__dirname, "..", "test-data", "Bates35-126T.tei.xml"));
        await remove(path.join(__dirname, "..", "test-data", "Bates35-132T.tei.xml"));
    });
*/
});
describe(`Confirm that excessive TEI markup is removed`, () => {
    let log, warn;
    beforeAll(() => {
        log = jest.spyOn(console, "log").mockImplementation(() => {});
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
        warn.mockReset();
        log.mockReset();
    });
    it("cleanup_of_msword_formatting - should be able to strip unwanted text formatting from a TEI file produced by OxGarage from a DOCX file", async () => {
        let identifier = "msword_formatting";
        let resource = "msword_formatting-tei.xml";
        let directory = await makeScratchCopy(
            "Issue-excessive_tei_markup/cleanup_of_msword_formatting"
        );

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            // pass two instance documents (the original, and the single-page paginated version) to the schematron validator
            const instance = [path.join(directory, resource), path.join(directory, "msword_formatting-001.tei.xml")];
            // this schematron schema validates that the second instance document has been correctly purged of cruft,
            // and also checks it against the original to validate that the textual content has not been munted
            const schema = path.join(directory, "schematron.xml");
            await validateWithSchematron({instance, schema});
        } finally {
            // clean up
            await removeScratchDirectory(directory);
        }
    });
    it("Batest34-github73 - should be able to strip unwanted text formatting from a TEI file produced by OxGarage from a DOCX file", async () => {
        let identifier = "Bates34";
        let resource = "Bates34-tei.xml";
        let directory = await makeScratchCopy("Issue-excessive_tei_markup/Bates34-github73", "ingest-docx");
        // use TEI as the default namespace so our XPath expressions are more concise
        let options = { xpathDefaultNamespace: "http://www.tei-c.org/ns/1.0" };

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            // if we get this far then the code has handled the file so let's just check
            //   a few of the expected output files have been created
            // the other test above actually checks that the processing is working as expected
            let resultFiles = [
                "Bates34-001aT.tei.xml",
                "Bates34-001bT.tei.xml",
                "Bates34-008.tei.xml",
            ];
            for (let file of resultFiles) {
                let exists = await pathExists(path.join(directory, file));
                expect(exists).toBeTrue;
            }
        } finally {
            // clean up
            await removeScratchDirectory(directory);
        }
    });
    it("should replace rs elements in hw0024 with placeName and persName github issue 123", async () => {
        let identifier = "hw0024";
        let resource = "hw0024-tei.xml";
        let directory = await makeScratchCopy(
            "issue-123-FtP-ingestion-with-people-and-places/hw0024"
        );
        // use TEI as the default namespace so our XPath expressions are more concise
        let options = { xpathDefaultNamespace: "http://www.tei-c.org/ns/1.0" };

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            const instance = path.join(directory, "hw0024-001.tei.xml");
            const schema = path.join(directory, "schematron.xml");
            await validateWithSchematron({instance, schema});
        } finally {
            // clean up
            await removeScratchDirectory(directory);
        }
    });
});
describe(`Confirm that documents with duplicate page identifiers are handled sensibly`, () => {
    let log, warn;
    beforeAll(() => {
        log = jest.spyOn(console, "log").mockImplementation(() => {});
        warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    });
    afterAll(() => {
        warn.mockReset();
        log.mockReset();
    });
    it("Bates34 - should fail to ingest Bates34-tei.xml as it contains duplicate page identifiers", async () => {
        let identifier = "Bates34";
        let directory = await makeScratchCopy("Issue-duplicate_page_identifiers/Bates34", "catch-duplicate-identifiers");
        let resource = "Bates34-tei.xml";

        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            throw new Error("Stylesheet failed to throw the expected error!");
        } catch (error) {
            expect(error.name).toBe("DuplicatePageIdentifiers");
            expect(error.message).toMatch(/ERROR:.*Bates34-023/);
            expect(error.message).toMatch(/ERROR:.*Bates34-025/);
            expect(error.message).toMatch(/ERROR:.*Bates34-048/);
            expect(error.message).toMatch(/ERROR:.*Bates34-066/);
            expect(error.message).toMatch(/ERROR:.*Bates34-100/);
        } finally {
            await removeScratchDirectory(directory);
        }
    });
    it("Bates35 - should fail to ingest Bates35.xml which contains duplicate page numbers", async () => {
        let identifier = "Bates35";
        let resource = "Bates35-tei.xml";
        let directory = await makeScratchCopy("Issue-duplicate_page_identifiers/Bates35", "catch-duplicate-identifiers");
        try {
            await __processTeiTranscriptionXMLProcessor({
                directory,
                identifier,
                resource,
            });
            throw new Error("Stylesheet failed to throw the expected error!");
        } catch (error) {
            expect(error.name).toBe("DuplicatePageIdentifiers");
            expect(error.message).toMatch(/ERROR:.*Bates35-0104/);
        } finally {
            await removeScratchDirectory(directory);
        }
    });
});
