import { fileFromPath } from "formdata-node/file-from-path";
import axios from "axios";
import { DOMParser, XMLSerializer } from "xmldom";
import fsExtra from "fs-extra";
const { writeFile } = fsExtra;

test();

// NB xmldom's 'children' and 'firstElementChild' properties don't work
function childElements(element) {
    return Array.from(element.childNodes).filter((node) => node.nodeType === 1); // nodeType 1 is an element
}

export async function test() {
    try {
        const form = new FormData();
        const filePath = "/srv/tasks/src/test-data/Succeeds-ftp-upload/Bates34/Bates34-tei.xml";
        form.append("identifier", "Bates34");
        form.append("page-identifier-regex", ".*");
        const source = await fileFromPath(filePath, "Bates34", { type: "application/xml" });
        form.append("source", source);
        const { data } = await axios.postForm("http://xml:8080/nyingarn/ingest-tei", form);
        const surfacesDocument = new DOMParser().parseFromString(data, "application/xml");
        const serializer = new XMLSerializer();
        const directoryElement = surfacesDocument.documentElement;
        // NB xmldom's 'children' and 'firstElementChild' properties don't work
        const childNodes = childElements(directoryElement);
        childNodes.forEach(function (childNode) {
            // childNode is a c:file element
            var fileName = childNode.getAttribute("name");
            // NB xmldom's 'children' and 'firstElementChild' properties don't work
            var surfaceElement = childElements(childNode)[0];
            writeFile(
                `/tmp/${fileName}`,
                serializer.serializeToString(surfaceElement),
                function (error) {
                    if (error) {
                        console.log(`Surface file ${fileName} could not be saved`);
                    } else {
                        console.log(`Surface file ${fileName} saved`);
                    }
                }
            );
        });
    } catch (error) {
        // the Axios error has a "response" property which is an object representing the HTTP response,
        // which in turn as a "data" property which is our XSLT error as a JS object deserialized from the
        // JSON body of the response. This "data" object should just be thrown as an error
        console.log(error.response.data);
    }
}
