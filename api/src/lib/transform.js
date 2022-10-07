// these endpoints will only return data they are responsible for
//
import previewStylesheet from "../common/tei-to-html.xsl.sef.json";
import SaxonJS from "saxon-js";

export async function transformDocument({ document }) {
    try {
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
    } catch (error) {
        console.log(error);
        return JSON.stringify({ error: error.message, code: error.code }, null, 2);
    }
}
