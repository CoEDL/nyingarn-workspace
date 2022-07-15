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
        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        try {
            await __processDigivolTranscriptionXMLProcessor({
                directory: path.join(__dirname, "../test-data"),
                identifier: identifier,
                resource: resource,
            });
            let contents = (await readdir(resourceDirectory)).sort();
            expectedFiles.forEach((file) => expect(contents).toContain(file));
            unexpectedFiles.forEach((file) => expect(contents).not.toContain(file));
        } catch (error) {
            console.log(error);
            throw error;
        } finally {
            expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
            unexpectedFiles.forEach((file) => remove(path.join(resourceDirectory, file))); 
        }
    });
    
    it("should remove file extensions (e.g. .jpg) from page identifiers", async () => {
        let identifier = "c018660";
        let resource = "c018660-tei.xml";
        let expectedFiles = [
            "c018660-004h.tei.xml", "c018660-006h.tei.xml", "c018660-007h.tei.xml", "c018660-008h.tei.xml", "c018660-009h.tei.xml", 
            "c018660-010h.tei.xml", "c018660-011h.tei.xml", "c018660-012h.tei.xml", "c018660-013h.tei.xml", "c018660-014h.tei.xml", 
            "c018660-015h.tei.xml", "c018660-016h.tei.xml", "c018660-017h.tei.xml", "c018660-018h.tei.xml", "c018660-019h.tei.xml", 
            "c018660-020h.tei.xml", "c018660-021h.tei.xml", "c018660-022h.tei.xml", "c018660-023h.tei.xml", "c018660-024h.tei.xml", 
            "c018660-025h.tei.xml", "c018660-026h.tei.xml", "c018660-027h.tei.xml", "c018660-028h.tei.xml", "c018660-029h.tei.xml", 
            "c018660-030h.tei.xml", "c018660-031h.tei.xml", "c018660-032h.tei.xml", "c018660-033h.tei.xml", "c018660-034h.tei.xml", 
            "c018660-035h.tei.xml", "c018660-036h.tei.xml", "c018660-037h.tei.xml", "c018660-038h.tei.xml", "c018660-039h.tei.xml", 
            "c018660-040h.tei.xml", "c018660-041h.tei.xml", "c018660-042h.tei.xml", "c018660-043h.tei.xml", "c018660-044h.tei.xml", 
            "c018660-045h.tei.xml", "c018660-046h.tei.xml", "c018660-047h.tei.xml", "c018660-048h.tei.xml", "c018660-049h.tei.xml", 
            "c018660-050h.tei.xml", "c018660-051h.tei.xml", "c018660-052h.tei.xml", "c018660-053h.tei.xml", "c018660-054h.tei.xml", 
            "c018660-055h.tei.xml", "c018660-056h.tei.xml", "c018660-057h.tei.xml", "c018660-058h.tei.xml", "c018660-059h.tei.xml", 
            "c018660-060h.tei.xml", "c018660-061h.tei.xml", "c018660-062h.tei.xml", "c018660-063h.tei.xml", "c018660-064h.tei.xml", 
            "c018660-065h.tei.xml", "c018660-066h.tei.xml", "c018660-067h.tei.xml", "c018660-068h.tei.xml", "c018660-069h.tei.xml", 
            "c018660-070h.tei.xml", "c018660-071h.tei.xml", "c018660-072h.tei.xml", "c018660-073h.tei.xml", "c018660-074h.tei.xml", 
            "c018660-075h.tei.xml", "c018660-076h.tei.xml", "c018660-077h.tei.xml", "c018660-078h.tei.xml", "c018660-079h.tei.xml", 
            "c018660-080h.tei.xml", "c018660-081h.tei.xml", "c018660-082h.tei.xml", "c018660-084h.tei.xml", "c018660-085h.tei.xml", 
            "c018660-086h.tei.xml", "c018660-087h.tei.xml", "c018660-088h.tei.xml", "c018660-089h.tei.xml", "c018660-090h.tei.xml", 
            "c018660-091h.tei.xml", "c018660-092h.tei.xml", "c018660-093h.tei.xml", "c018660-094h.tei.xml", "c018660-095h.tei.xml", 
            "c018660-096h.tei.xml", "c018660-097h.tei.xml", "c018660-098h.tei.xml", "c018660-099h.tei.xml", "c018660-100h.tei.xml", 
            "c018660-101h.tei.xml", "c018660-102h.tei.xml", "c018660-103h.tei.xml", "c018660-104h.tei.xml", "c018660-105h.tei.xml", 
            "c018660-106h.tei.xml", "c018660-107h.tei.xml", "c018660-108h.tei.xml", "c018660-109h.tei.xml", "c018660-110h.tei.xml", 
            "c018660-111h.tei.xml", "c018660-112h.tei.xml", "c018660-113h.tei.xml", "c018660-114h.tei.xml", "c018660-115h.tei.xml", 
            "c018660-116h.tei.xml", "c018660-117h.tei.xml", "c018660-118h.tei.xml", "c018660-119h.tei.xml", "c018660-120h.tei.xml", 
            "c018660-121h.tei.xml", "c018660-122h.tei.xml", "c018660-123h.tei.xml", "c018660-124h.tei.xml", "c018660-125h.tei.xml", 
            "c018660-126h.tei.xml", "c018660-127h.tei.xml", "c018660-128h.tei.xml", "c018660-129h.tei.xml", "c018660-130h.tei.xml", 
            "c018660-131h.tei.xml", "c018660-132h.tei.xml", "c018660-133h.tei.xml", "c018660-134h.tei.xml", "c018660-135h.tei.xml", 
            "c018660-136h.tei.xml", "c018660-137h.tei.xml", "c018660-138h.tei.xml", "c018660-139h.tei.xml", "c018660-140h.tei.xml", 
            "c018660-141h.tei.xml", "c018660-142h.tei.xml", "c018660-143h.tei.xml", "c018660-144h.tei.xml", "c018660-145h.tei.xml", 
            "c018660-146h.tei.xml", "c018660-147h.tei.xml", "c018660-148h.tei.xml", "c018660-149h.tei.xml", "c018660-150h.tei.xml", 
            "c018660-151h.tei.xml", "c018660-152h.tei.xml", "c018660-153h.tei.xml", "c018660-159h.tei.xml", "c018660-160h.tei.xml", 
            "c018660-161h.tei.xml", "c018660-162h.tei.xml", "c018660-163h.tei.xml", "c018660-164h.tei.xml", "c018660-165h.tei.xml", 
            "c018660-166h.tei.xml", "c018660-167h.tei.xml", "c018660-168h.tei.xml", "c018660-169h.tei.xml", "c018660-170h.tei.xml", 
            "c018660-171h.tei.xml", "c018660-172h.tei.xml", "c018660-173h.tei.xml", "c018660-174h.tei.xml", "c018660-175h.tei.xml", 
            "c018660-176h.tei.xml", "c018660-177h.tei.xml", "c018660-178h.tei.xml", "c018660-179h.tei.xml"
        ];
        let unexpectedFiles = [
            "c018660-004h.jpg.tei.xml", "c018660-006h.jpg.tei.xml", "c018660-007h.jpg.tei.xml", "c018660-008h.jpg.tei.xml", "c018660-009h.jpg.tei.xml", 
            "c018660-010h.jpg.tei.xml", "c018660-011h.jpg.tei.xml", "c018660-012h.jpg.tei.xml", "c018660-013h.jpg.tei.xml", "c018660-014h.jpg.tei.xml", 
            "c018660-015h.jpg.tei.xml", "c018660-016h.jpg.tei.xml", "c018660-017h.jpg.tei.xml", "c018660-018h.jpg.tei.xml", "c018660-019h.jpg.tei.xml", 
            "c018660-020h.jpg.tei.xml", "c018660-021h.jpg.tei.xml", "c018660-022h.jpg.tei.xml", "c018660-023h.jpg.tei.xml", "c018660-024h.jpg.tei.xml", 
            "c018660-025h.jpg.tei.xml", "c018660-026h.jpg.tei.xml", "c018660-027h.jpg.tei.xml", "c018660-028h.jpg.tei.xml", "c018660-029h.jpg.tei.xml", 
            "c018660-030h.jpg.tei.xml", "c018660-031h.jpg.tei.xml", "c018660-032h.jpg.tei.xml", "c018660-033h.jpg.tei.xml", "c018660-034h.jpg.tei.xml", 
            "c018660-035h.jpg.tei.xml", "c018660-036h.jpg.tei.xml", "c018660-037h.jpg.tei.xml", "c018660-038h.jpg.tei.xml", "c018660-039h.jpg.tei.xml", 
            "c018660-040h.jpg.tei.xml", "c018660-041h.jpg.tei.xml", "c018660-042h.jpg.tei.xml", "c018660-043h.jpg.tei.xml", "c018660-044h.jpg.tei.xml", 
            "c018660-045h.jpg.tei.xml", "c018660-046h.jpg.tei.xml", "c018660-047h.jpg.tei.xml", "c018660-048h.jpg.tei.xml", "c018660-049h.jpg.tei.xml", 
            "c018660-050h.jpg.tei.xml", "c018660-051h.jpg.tei.xml", "c018660-052h.jpg.tei.xml", "c018660-053h.jpg.tei.xml", "c018660-054h.jpg.tei.xml", 
            "c018660-055h.jpg.tei.xml", "c018660-056h.jpg.tei.xml", "c018660-057h.jpg.tei.xml", "c018660-058h.jpg.tei.xml", "c018660-059h.jpg.tei.xml", 
            "c018660-060h.jpg.tei.xml", "c018660-061h.jpg.tei.xml", "c018660-062h.jpg.tei.xml", "c018660-063h.jpg.tei.xml", "c018660-064h.jpg.tei.xml", 
            "c018660-065h.jpg.tei.xml", "c018660-066h.jpg.tei.xml", "c018660-067h.jpg.tei.xml", "c018660-068h.jpg.tei.xml", "c018660-069h.jpg.tei.xml", 
            "c018660-070h.jpg.tei.xml", "c018660-071h.jpg.tei.xml", "c018660-072h.jpg.tei.xml", "c018660-073h.jpg.tei.xml", "c018660-074h.jpg.tei.xml", 
            "c018660-075h.jpg.tei.xml", "c018660-076h.jpg.tei.xml", "c018660-077h.jpg.tei.xml", "c018660-078h.jpg.tei.xml", "c018660-079h.jpg.tei.xml", 
            "c018660-080h.jpg.tei.xml", "c018660-081h.jpg.tei.xml", "c018660-082h.jpg.tei.xml", "c018660-084h.jpg.tei.xml", "c018660-085h.jpg.tei.xml", 
            "c018660-086h.jpg.tei.xml", "c018660-087h.jpg.tei.xml", "c018660-088h.jpg.tei.xml", "c018660-089h.jpg.tei.xml", "c018660-090h.jpg.tei.xml", 
            "c018660-091h.jpg.tei.xml", "c018660-092h.jpg.tei.xml", "c018660-093h.jpg.tei.xml", "c018660-094h.jpg.tei.xml", "c018660-095h.jpg.tei.xml", 
            "c018660-096h.jpg.tei.xml", "c018660-097h.jpg.tei.xml", "c018660-098h.jpg.tei.xml", "c018660-099h.jpg.tei.xml", "c018660-100h.jpg.tei.xml", 
            "c018660-101h.jpg.tei.xml", "c018660-102h.jpg.tei.xml", "c018660-103h.jpg.tei.xml", "c018660-104h.jpg.tei.xml", "c018660-105h.jpg.tei.xml", 
            "c018660-106h.jpg.tei.xml", "c018660-107h.jpg.tei.xml", "c018660-108h.jpg.tei.xml", "c018660-109h.jpg.tei.xml", "c018660-110h.jpg.tei.xml", 
            "c018660-111h.jpg.tei.xml", "c018660-112h.jpg.tei.xml", "c018660-113h.jpg.tei.xml", "c018660-114h.jpg.tei.xml", "c018660-115h.jpg.tei.xml", 
            "c018660-116h.jpg.tei.xml", "c018660-117h.jpg.tei.xml", "c018660-118h.jpg.tei.xml", "c018660-119h.jpg.tei.xml", "c018660-120h.jpg.tei.xml", 
            "c018660-121h.jpg.tei.xml", "c018660-122h.jpg.tei.xml", "c018660-123h.jpg.tei.xml", "c018660-124h.jpg.tei.xml", "c018660-125h.jpg.tei.xml", 
            "c018660-126h.jpg.tei.xml", "c018660-127h.jpg.tei.xml", "c018660-128h.jpg.tei.xml", "c018660-129h.jpg.tei.xml", "c018660-130h.jpg.tei.xml", 
            "c018660-131h.jpg.tei.xml", "c018660-132h.jpg.tei.xml", "c018660-133h.jpg.tei.xml", "c018660-134h.jpg.tei.xml", "c018660-135h.jpg.tei.xml", 
            "c018660-136h.jpg.tei.xml", "c018660-137h.jpg.tei.xml", "c018660-138h.jpg.tei.xml", "c018660-139h.jpg.tei.xml", "c018660-140h.jpg.tei.xml", 
            "c018660-141h.jpg.tei.xml", "c018660-142h.jpg.tei.xml", "c018660-143h.jpg.tei.xml", "c018660-144h.jpg.tei.xml", "c018660-145h.jpg.tei.xml", 
            "c018660-146h.jpg.tei.xml", "c018660-147h.jpg.tei.xml", "c018660-148h.jpg.tei.xml", "c018660-149h.jpg.tei.xml", "c018660-150h.jpg.tei.xml", 
            "c018660-151h.jpg.tei.xml", "c018660-152h.jpg.tei.xml", "c018660-153h.jpg.tei.xml", "c018660-159h.jpg.tei.xml", "c018660-160h.jpg.tei.xml", 
            "c018660-161h.jpg.tei.xml", "c018660-162h.jpg.tei.xml", "c018660-163h.jpg.tei.xml", "c018660-164h.jpg.tei.xml", "c018660-165h.jpg.tei.xml", 
            "c018660-166h.jpg.tei.xml", "c018660-167h.jpg.tei.xml", "c018660-168h.jpg.tei.xml", "c018660-169h.jpg.tei.xml", "c018660-170h.jpg.tei.xml", 
            "c018660-171h.jpg.tei.xml", "c018660-172h.jpg.tei.xml", "c018660-173h.jpg.tei.xml", "c018660-174h.jpg.tei.xml", "c018660-175h.jpg.tei.xml", 
            "c018660-176h.jpg.tei.xml", "c018660-177h.jpg.tei.xml", "c018660-178h.jpg.tei.xml", "c018660-179h.jpg.tei.xml"
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
    
    it("should ingest a TEI file produced by OxGarage from a DOCX file, stripping extensions from page identifiers", async () => {
        let identifier = "c018660";
        // This document contains page-identifiers which include a ".jpg" extension. This test validates that the output files have
        // the extension ".tei.xml" rather than ".jpg.tei.xml"
        let resource = "c018660-tei.xml";
        let expectedFiles = [
            "c018660-004h.tei.xml", "c018660-006h.tei.xml", "c018660-007h.tei.xml", "c018660-008h.tei.xml", "c018660-009h.tei.xml", 
            "c018660-010h.tei.xml", "c018660-011h.tei.xml", "c018660-012h.tei.xml", "c018660-013h.tei.xml", "c018660-014h.tei.xml", 
            "c018660-015h.tei.xml", "c018660-016h.tei.xml", "c018660-017h.tei.xml", "c018660-018h.tei.xml", "c018660-019h.tei.xml", 
            "c018660-020h.tei.xml", "c018660-021h.tei.xml", "c018660-022h.tei.xml", "c018660-023h.tei.xml", "c018660-024h.tei.xml", 
            "c018660-025h.tei.xml", "c018660-026h.tei.xml", "c018660-027h.tei.xml", "c018660-028h.tei.xml", "c018660-029h.tei.xml", 
            "c018660-030h.tei.xml", "c018660-031h.tei.xml", "c018660-032h.tei.xml", "c018660-033h.tei.xml", "c018660-034h.tei.xml", 
            "c018660-035h.tei.xml", "c018660-036h.tei.xml", "c018660-037h.tei.xml", "c018660-038h.tei.xml", "c018660-039h.tei.xml", 
            "c018660-040h.tei.xml", "c018660-041h.tei.xml", "c018660-042h.tei.xml", "c018660-043h.tei.xml", "c018660-044h.tei.xml", 
            "c018660-045h.tei.xml", "c018660-046h.tei.xml", "c018660-047h.tei.xml", "c018660-048h.tei.xml", "c018660-049h.tei.xml", 
            "c018660-050h.tei.xml", "c018660-051h.tei.xml", "c018660-052h.tei.xml", "c018660-053h.tei.xml", "c018660-054h.tei.xml", 
            "c018660-055h.tei.xml", "c018660-056h.tei.xml", "c018660-057h.tei.xml", "c018660-058h.tei.xml", "c018660-059h.tei.xml", 
            "c018660-060h.tei.xml", "c018660-061h.tei.xml", "c018660-062h.tei.xml", "c018660-063h.tei.xml", "c018660-064h.tei.xml", 
            "c018660-065h.tei.xml", "c018660-066h.tei.xml", "c018660-067h.tei.xml", "c018660-068h.tei.xml", "c018660-069h.tei.xml", 
            "c018660-070h.tei.xml", "c018660-071h.tei.xml", "c018660-072h.tei.xml", "c018660-073h.tei.xml", "c018660-074h.tei.xml", 
            "c018660-075h.tei.xml", "c018660-076h.tei.xml", "c018660-077h.tei.xml", "c018660-078h.tei.xml", "c018660-079h.tei.xml", 
            "c018660-080h.tei.xml", "c018660-081h.tei.xml", "c018660-082h.tei.xml", "c018660-084h.tei.xml", "c018660-085h.tei.xml", 
            "c018660-086h.tei.xml", "c018660-087h.tei.xml", "c018660-088h.tei.xml", "c018660-089h.tei.xml", "c018660-090h.tei.xml", 
            "c018660-091h.tei.xml", "c018660-092h.tei.xml", "c018660-093h.tei.xml", "c018660-094h.tei.xml", "c018660-095h.tei.xml", 
            "c018660-096h.tei.xml", "c018660-097h.tei.xml", "c018660-098h.tei.xml", "c018660-099h.tei.xml", "c018660-100h.tei.xml", 
            "c018660-101h.tei.xml", "c018660-102h.tei.xml", "c018660-103h.tei.xml", "c018660-104h.tei.xml", "c018660-105h.tei.xml", 
            "c018660-106h.tei.xml", "c018660-107h.tei.xml", "c018660-108h.tei.xml", "c018660-109h.tei.xml", "c018660-110h.tei.xml", 
            "c018660-111h.tei.xml", "c018660-112h.tei.xml", "c018660-113h.tei.xml", "c018660-114h.tei.xml", "c018660-115h.tei.xml", 
            "c018660-116h.tei.xml", "c018660-117h.tei.xml", "c018660-118h.tei.xml", "c018660-119h.tei.xml", "c018660-120h.tei.xml", 
            "c018660-121h.tei.xml", "c018660-122h.tei.xml", "c018660-123h.tei.xml", "c018660-124h.tei.xml", "c018660-125h.tei.xml", 
            "c018660-126h.tei.xml", "c018660-127h.tei.xml", "c018660-128h.tei.xml", "c018660-129h.tei.xml", "c018660-130h.tei.xml", 
            "c018660-131h.tei.xml", "c018660-132h.tei.xml", "c018660-133h.tei.xml", "c018660-134h.tei.xml", "c018660-135h.tei.xml", 
            "c018660-136h.tei.xml", "c018660-137h.tei.xml", "c018660-138h.tei.xml", "c018660-139h.tei.xml", "c018660-140h.tei.xml", 
            "c018660-141h.tei.xml", "c018660-142h.tei.xml", "c018660-143h.tei.xml", "c018660-144h.tei.xml", "c018660-145h.tei.xml", 
            "c018660-146h.tei.xml", "c018660-147h.tei.xml", "c018660-148h.tei.xml", "c018660-149h.tei.xml", "c018660-150h.tei.xml", 
            "c018660-151h.tei.xml", "c018660-152h.tei.xml", "c018660-153h.tei.xml", "c018660-159h.tei.xml", "c018660-160h.tei.xml", 
            "c018660-161h.tei.xml", "c018660-162h.tei.xml", "c018660-163h.tei.xml", "c018660-164h.tei.xml", "c018660-165h.tei.xml", 
            "c018660-166h.tei.xml", "c018660-167h.tei.xml", "c018660-168h.tei.xml", "c018660-169h.tei.xml", "c018660-170h.tei.xml", 
            "c018660-171h.tei.xml", "c018660-172h.tei.xml", "c018660-173h.tei.xml", "c018660-174h.tei.xml", "c018660-175h.tei.xml", 
            "c018660-176h.tei.xml", "c018660-177h.tei.xml", "c018660-178h.tei.xml", "c018660-179h.tei.xml"
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

    it("should be able to pass a hierarchically structured TEI file through an XSLT", async () => {
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

        let resourceDirectory = path.join(__dirname, "../test-data", identifier);
        let contents = (await readdir(resourceDirectory)).sort();
        expectedFiles.forEach((file) => expect(contents).toContain(file));
        expectedFiles.forEach((file) => remove(path.join(resourceDirectory, file)));
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
