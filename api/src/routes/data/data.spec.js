import "regenerator-runtime";
import { loadConfiguration } from "../../common";
import { groupFilesByResource } from "../../lib/item";

describe("Test data processing functions", () => {
    test("test resource file handling", async () => {
        let configuration = await loadConfiguration();

        let files = ["test-001.tif"];
        ({ files } = groupFilesByResource({
            identifier: "test",
            files,
            naming: configuration.api.filenaming,
        }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(1);

        files = ["test-001.tif", "test-001-ADMIN_thumbnail.jpg"];
        ({ files } = groupFilesByResource({
            identifier: "test",
            files,
            naming: configuration.api.filenaming,
        }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(2);

        files = ["test-001.tif", "test-001.thumbnail_h300.jpg"];
        ({ files } = groupFilesByResource({
            identifier: "test",
            files,
            naming: configuration.api.filenaming,
        }));
        expect(Object.keys(files).length).toEqual(1);
        expect(files["001"].length).toEqual(2);
    });
});
