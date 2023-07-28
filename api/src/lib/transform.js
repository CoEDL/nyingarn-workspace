// these endpoints will only return data they are responsible for
//
// const previewStylesheet = JSON.parse(
//     await readFile(new URL("../common/tei-to-html.xsl.sef.json", import.meta.url))
// );

//  TODO: Consider changing this to POST to the xml container down the track
//  TODO:   so we can ditch saxonJS altogether

import previewStylesheet from "../common/xslt/tei-to-html.xsl.sef.json" assert { type: "json" };
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
