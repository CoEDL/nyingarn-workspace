// these endpoints will only return data they are responsible for
//
import { readFile } from "fs/promises";
// const previewStylesheet = JSON.parse(
//     await readFile(new URL("../common/tei-to-html.xsl.sef.json", import.meta.url))
// );
import previewStylesheet from "../common/tei-to-html.xsl.sef.json" assert { type: "json" };
import SaxonJS from "saxon-js";

export async function transformDocument({ document }) {
    let result = await SaxonJS.transform(
        {
            stylesheetText: JSON.stringify(previewStylesheet),
            sourceText: document,
            destination: "raw",
            outputPropertis: { method: "xml", indent: false },
            deliverResultDocument: function (uri) {
                return {
                    destination: "serialized",
                };
            },
        },
        "async"
    );
    document = SaxonJS.serialize(result.principalResult);
    return document;
}
