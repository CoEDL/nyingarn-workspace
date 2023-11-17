import { loadConfiguration } from "./configuration.js";
import fsExtraPkg from "fs-extra";
const { writeJSON } = fsExtraPkg;
import models from "../models/index.js";
import Chance from "chance";
const chance = Chance();
import lodashPkg from "lodash";
const { range, cloneDeep } = lodashPkg;
import { createItem } from "../lib/item.js";
import { createCollection } from "../lib/collection.js";
import { getS3Handle } from "./getS3Handle.js";

const bucketName = "testing";
export const host = `http://localhost:8080`;
export function teiDocument(identifier) {
    return `
<?xml version="1.0" encoding="UTF-8"?>
    <TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:c="http://www.w3.org/ns/xproc-step" xmlns:cx="http://xmlcalabash.com/ns/extensions" xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:nyingarn="https://nyingarn.net/ns/functions" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:z="https://github.com/Conal-Tuohy/XProc-Z" xml:id="MarcoTest">
    <teiHeader>
    <fileDesc><titleStmt><title>My Research Object Crate</title></titleStmt><publicationStmt><publisher><ref target="https://nyingarn.net/">Nyingarn</ref></publisher></publicationStmt><sourceDesc><p>some text</p></sourceDesc></fileDesc>
   <xenoData type="application/ld+json">{
    "@graph": [
    {
      "identifier": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      "about": { "@id": ".\/" },
      "@id": "ro-crate-metadata.json",
      "conformsTo": { "@id": "https:\/\/w3id.org\/ro\/crate\/1.1" }
    },
    {
      "rightsHolder": { "@id": "https:\/\/orcid.org\/0000-0003-1783-627X" },
      "identifier": "MarcoTest",
      "licence": { "@id": "LICENCE.md" },
      "hasPart": [
        { "@id": "MarcoTest-357.jpg" },
        { "@id": "MarcoTest-357.tei.xml" },
        { "@id": "MarcoTest-357.textract_ocr-ADMIN.json" },
        { "@id": "MarcoTest-357.thumbnail_h300.jpg" },
        { "@id": "MarcoTest-357.webp" },
        { "@id": "MarcoTest-4003.jpg" },
        { "@id": "MarcoTest-4003.tei.xml" },
        { "@id": "MarcoTest-4003.textract_ocr-ADMIN.json" },
        { "@id": "MarcoTest-4003.thumbnail_h300.jpg" },
        { "@id": "MarcoTest-4003.webp" },
        { "@id": "MarcoTest-language-authority-permission.pdf" },
        { "@id": "MarcoTest-rights-holder-permission.pdf" },
        { "@id": ".item-status.json" },
        { "@id": "MarcoTest-tei-complete.xml" },
        { "@id": "LICENCE.md" },
        { "@id": "MarcoTest-tei-complete.v2023-07-10T03:50:13.975Z.xml" }
      ],
      "@type": [ "Dataset" ],
      "author": { "@id": "https:\/\/orcid.org\/0000-0003-1783-627X" },
      "description": "some text",
      "languageName": "more text",
      "subjectLanguage": { "@id": "https:\/\/collection.aiatsis.gov.au\/austlang\/language\/D2" },
      "copyrightStatus": "Yes = in copyright",
      "name": "My Research Object Crate",
      "contentLanguage": [
        { "@id": "https:\/\/collection.aiatsis.gov.au\/austlang\/language\/W40" },
        { "@id": "https:\/\/collection.aiatsis.gov.au\/austlang\/language\/A48" },
        { "@id": "#e27" }
      ],
      "depositor": { "@id": "https:\/\/orcid.org\/0000-0001-5383-6993" },
      "@id": ".\/"
    },
    ]
   }</xenodata>
    </teiHeader><text><body><pb xml:id="${identifier}-357"/>
<ab>A<lb/>
English and <unclear>Aboriginal</unclear><lb/>
A<lb/>
<unclear>Allow</unclear><lb/>
Anoy<lb/>
Along<lb/>
<unclear>Kash</unclear> too bur-roin<lb/>
answer<lb/>
<unclear>Foom</unclear> boon<lb/>
-<lb/>
Also<lb/>
<unclear>tey</unclear><lb/>
<unclear>ant</unclear> <unclear>small kind</unclear><lb/>
<unclear>Beal-</unclear> <unclear>belp</unclear><lb/>
<unclear>Ber</unclear><lb/>
<unclear>ser-gun</unclear><lb/>
do bull<lb/>
<unclear>nur</unclear> <unclear>murn</unclear><lb/>
<unclear>Amidel</unclear><lb/>
<unclear>Bar-go-rut</unclear><lb/>
Ankle<lb/>
Beur nar <unclear>fer</unclear><lb/>
Amiss<lb/>
<unclear>nil</unclear> lam<lb/>
apartment<lb/>
<unclear>Wil-mut</unclear><lb/>
and<lb/>
Bar<lb/>
apple<lb/>
Bool <unclear>le-vrum</unclear><lb/>
<unclear>anget</unclear><lb/>
Pork <unclear>bork/bar-ren</unclear><lb/>
<unclear>War-ra</unclear> <unclear>three</unclear><lb/>
<unclear>Lam-bar-more</unclear><lb/>
another<lb/>
<unclear>th</unclear> ung<lb/>
arch on Gap<lb/>
Pear - <unclear>bor</unclear> ring</ab>
</body></text></TEI>`;
}

export function headers(session) {
    return {
        authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        testing: true,
    };
}

export class TestSetup {
    constructor() {
        this.originalConfiguration = {};
    }

    async setupBeforeAll() {
        const userEmail = chance.email();
        const adminEmail = chance.email();
        let configuration = await loadConfiguration();

        let { s3, bucket } = await getS3Handle({ configuration });
        return { userEmail, adminEmail, configuration, bucket };
    }

    async setupUsers({ emails = [], adminEmails = [] }) {
        let users = [];
        for (let email of emails) {
            let user = await models.user.create({
                email: email,
                provider: "unset",
                locked: false,
                upload: false,
                administrator: false,
            });
            users.push(user);
        }
        for (let email of adminEmails) {
            let user = await models.user.create({
                email: email,
                provider: "unset",
                locked: false,
                upload: false,
                administrator: true,
            });
            users.push(user);
        }
        return users;
    }

    async purgeUsers({ users = [] }) {
        for (let user of users) {
            await user.destroy();
        }
    }

    async teardownAfterAll(configuration) {
        await models.log.truncate();
        await models.collection.destroy({ where: {} });
        await models.item.destroy({ where: {} });
        await models.user.destroy({ where: {} });
        models.sequelize.close();
    }
}

export async function generateLogs(info, warn, error) {
    for (let i in range(info)) {
        await models.log.create({ level: "info", owner: chance.email(), text: chance.sentence() });
    }
    for (let i in range(warn)) {
        await models.log.create({ level: "warn", owner: chance.email(), text: chance.sentence() });
    }
    for (let i in range(error)) {
        await models.log.create({ level: "error", owner: chance.email(), text: chance.sentence() });
    }
}

export async function setupTestItem({ identifier, store, user }) {
    let item = await createItem({ identifier, userId: user.id });
    await store.put({
        batch: [
            {
                json: { some: "thing" },
                target: `${identifier}-01.json`,
            },
            {
                content: "text",
                target: `${identifier}-01.txt`,
            },
            {
                json: { some: "thing" },
                target: `${identifier}-02.json`,
            },
            {
                content: "text",
                target: `${identifier}-02.txt`,
            },
            {
                content: teiDocument(identifier),
                target: `${identifier}-tei-complete.xml`,
            },
        ],
    });
    return { item };
}

export async function setupTestCollection({ identifier, user }) {
    let collection = await createCollection({ identifier, userId: user.id });
    return { collection };
}
