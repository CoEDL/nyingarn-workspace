import "regenerator-runtime";
import { processFtpTeiTranscription } from "./transcription-processing";
import path from "path";
import { readdir, remove } from "fs-extra";

describe("Test transcription processing utils", () => {
    it("should be able to process a digivol csv file", async () => {});

    it.only("should be able to process an FTP tei file", async () => {
        await processFtpTeiTranscription({
            directory: path.join(__dirname, ".."),
            identifier: "test-data",
            resource: "ftp-tei.xml",
        });

        let contents = (await readdir(path.join(__dirname, "..", "test-data"))).sort();
        expect(contents).toEqual([
            "Bates35-125T.tei.xml",
            "Bates35-126T.tei.xml",
            "Bates35-132T.tei.xml",
            "ftp-tei.xml",
        ]);
        await remove(path.join(__dirname, "..", "test-data", "Bates35-125T.tei.xml"));
        await remove(path.join(__dirname, "..", "test-data", "Bates35-126T.tei.xml"));
        await remove(path.join(__dirname, "..", "test-data", "Bates35-132T.tei.xml"));
    });
});
