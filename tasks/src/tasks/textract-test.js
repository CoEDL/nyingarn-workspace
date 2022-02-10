const { TextractClient, DetectDocumentTextCommand } = require("@aws-sdk/client-textract");
const path = require("path");
const { readFile, writeJSON } = require("fs-extra");

async function main() {
    const configuration = {
        credentials: {
            accessKeyId: "AKIAJ36GQXK3VJVN3CFQ",
            secretAccessKey: "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",
        },
        region: "ap-southeast-2",
    };
    const file = "BM1648A72-0004.jpg";
    const output = `${file.split(".").shift()}.json`;
    const client = new TextractClient(configuration);
    const data = await readFile(path.join(__dirname, file));
    const params = {
        Document: {
            Bytes: data,
        },
    };
    const command = new DetectDocumentTextCommand(params);

    try {
        const data = await client.send(command);
        await writeJSON(output, data);
        // process data.
    } catch (error) {
        // error handling.
        console.log("error", error);
    } finally {
        // finally.
    }
}
main();
