import path from "path";
import { pathExists, createReadStream, writeFile } from "fs-extra";
import { parse } from "csv-parse";
import { zipObject } from "lodash";
import { getS3Handle } from "../common";
import { getFiles } from "./";

export async function processDigivolTranscription({ directory, identifier, resource }) {
    let file = path.join(directory, identifier, resource);

    const records = [];
    const parser = createReadStream(file).pipe(
        parse({
            // CSV options if any
        })
    );
    for await (const record of parser) {
        // Work with each record
        records.push(record);
    }

    let data = [];
    let properties = records.shift();
    for (let record of records) {
        data.push(zipObject(properties, record));
    }

    let { bucket } = await getS3Handle();
    for (let record of data) {
        const re = new RegExp(`^${identifier}-.*`);
        if (record.externalIdentifier && record.externalIdentifier.match(re)) {
            let filename = `${record.externalIdentifier.split(".").shift()}.tei.xml`;
            let teiFile = path.join(identifier, filename);
            let exists = await bucket.pathExists({ path: teiFile });

            if (!exists) {
                filename = path.join(directory, identifier, filename);
                await writeFile(filename, record.occurrenceRemarks);
            }
        }
    }
}

export async function processFtpTeiTranscription({ directory, identifier, resource }) {}
