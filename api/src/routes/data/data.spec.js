import "regenerator-runtime";
import { loadConfiguration } from "../../common";
import { groupFilesByResource } from "../../lib/data";

describe("Test data processing functions", () => {
    test("test resource file handling", async () => {
        let configuration = await loadConfiguration();

        let files = ["test/test-001.tif"];
        ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(1);

        files = ["test/test-001.tif", "test/ro-crate-metadata.json"];
        ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(1);

        files = ["test/test-001.tif", "test/test-001-ADMIN_thumbnail.jpg"];
        ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(2);

        files = ["test/test-001.tif", "test/test-001.thumbnail_h300.jpg"];
        ({ files } = groupFilesByResource({ files, naming: configuration.api.filenaming }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(2);
    });
});
