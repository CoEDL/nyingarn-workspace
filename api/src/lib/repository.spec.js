require("regenerator-runtime");
import Chance from "chance";
const chance = Chance();
import {
    loadConfiguration,
    getStoreHandle,
    getS3Handle,
    TestSetup,
    indexItem,
} from "../common/index.js";
import models from "../models/index.js";
import { importRepositoryContentFromStorageIntoTheDb, getRepositoryItems } from "./repository.js";
import { Client } from "@elastic/elasticsearch";

describe("Repository management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
        configuration = await loadConfiguration();
        let { bucket } = await getS3Handle();
        await bucket.removeObjects({ prefix: "nyingarn.net/repository" });
        await models.repoitem.destroy({ where: {} });
    });
    beforeEach(async () => {
        identifier = chance.word();
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });
    it("should be able to import items and collections from the storage into the DB", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
            location: "repository",
        });
        await storeItem.createObject();

        let storeCollection = await getStoreHandle({
            id: identifier,
            type: "collection",
            location: "repository",
        });
        await storeCollection.createObject();

        let user = users.filter((u) => !u.administrator)[0];
        let adminUser = users.filter((u) => u.administrator)[0];
        const configuration = await loadConfiguration();

        try {
            await importRepositoryContentFromStorageIntoTheDb({ user, configuration });
        } catch (error) {
            expect(error.message).toEqual("User must be an admin");
        }
        // import repository content
        await importRepositoryContentFromStorageIntoTheDb({ user: adminUser, configuration });

        // retrieve all items
        let { items } = await getRepositoryItems({ user: adminUser });
        expect(items.length).toEqual(2);
        expect(items.filter((i) => i.identifier === identifier)[0]).toMatchObject({
            identifier,
        });

        await models.repoitem.destroy({ where: { identifier } });
        await storeItem.removeObject();
        await storeCollection.removeObject();
    });
    it("should be able to index a repository item", async () => {
        let storeItem = await getStoreHandle({
            id: identifier,
            type: "item",
            location: "repository",
        });
        await storeItem.createObject();

        let crate = await storeItem.getJSON({ target: "ro-crate-metadata.json" });

        crate["@graph"] = [
            crate["@graph"][0],
            {
                "@id": "./",
                "@type": "Dataset",
                name: "crate",
                author: { "@id": "#person1" },
                thingo: { "@id": "#thingo1" },
            },
            {
                "@id": "#person1",
                "@type": "Person",
                name: "person1",
                thing: { "@id": "#thingo1" },
            },
            {
                "@id": "#thingo1",
                "@type": ["Thing", "SubThing"],
                name: "thingo1",
            },
        ];

        await indexItem({
            item: { identifier, type: "item" },
            crate,
        });

        const client = new Client({
            node: configuration.api.services.elastic.host,
        });
        let document = await client.get({
            index: "metadata",
            id: `/item/${identifier}`,
        });
        expect(document._source).toMatchObject({
            "@id": "./",
            "@type": ["Dataset"],
            name: ["crate"],
            author: [{}],
            thingo: [{}],
        });
        let person = await client.get({
            index: "person",
            id: `#person1`,
        });
        expect(person._source).toMatchObject({
            "@id": "#person1",
            "@type": ["Person"],
            name: "person1",
        });

        await models.repoitem.destroy({ where: { identifier } });
        await storeItem.removeObject();
    });
    it("should be able to index a complex item with lots of entities", async () => {
        let crate = {
            "@context": [
                "https://w3id.org/ro/crate/1.1/context",
                "http://purl.archive.org/language-data-commons/context.json",
                {
                    "@vocab": "http://schema.org/",
                },
                {
                    "@base": null,
                },
            ],
            "@graph": [
                {
                    "@id": "ro-crate-metadata.json",
                    "@type": "CreativeWork",
                    conformsTo: {
                        "@id": "https://w3id.org/ro/crate/1.1",
                    },
                    about: {
                        "@id": "./",
                    },
                    identifier: "ro-crate-metadata.json",
                },
                {
                    "@id": "./",
                    "@type": ["Dataset"],
                    "@reverse": {},
                    name: "My Research Object Crate",
                    hasPart: [
                        {
                            "@id": ".completed-resources.json",
                        },
                        {
                            "@id": "Bates33-001bT.jpg",
                        },
                        {
                            "@id": "Bates33-001bT.tei.xml",
                        },
                        {
                            "@id": "Bates33-001bT.thumbnail_h300.jpg",
                        },
                        {
                            "@id": "Bates33-001bT.webp",
                        },
                        {
                            "@id": "Bates33-digivol.csv",
                        },
                        {
                            "@id": "Bates33-rights-holder-permission.pdf",
                        },
                        {
                            "@id": "Bates33-tei-complete.xml",
                        },
                        {
                            "@id": "Bates33-language-authority-permission.pdf",
                        },
                        {
                            "@id": ".item-status.json",
                        },
                        {
                            "@id": "LICENCE.md",
                        },
                        {
                            "@id": "Bates33-001.tei.xml",
                        },
                        {
                            "@id": "Bates33-002.tei.xml",
                        },
                        {
                            "@id": "Bates33-003.tei.xml",
                        },
                        {
                            "@id": "Bates33-tei.xml",
                        },
                    ],
                    depositor: {
                        "@id": "#Marco_La_Rosa",
                    },
                    identifier: "Bates33",
                    memberOf: {
                        "@id": "https://catalog.nyingarn.net/collections/collection",
                    },
                    subjectLanguage: {
                        "@id": "https://collection.aiatsis.gov.au/austlang/language/D2",
                    },
                    licence: {
                        "@id": "LICENCE.md",
                    },
                    holdingInstitution: {
                        "@id": "https://ror.org/01ej9dk98",
                    },
                },
                {
                    "@id": ".completed-resources.json",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: ".completed-resources.json",
                    dateModified: "2023-03-29T02:43:04.000Z",
                    encodingFormat: "application/json",
                },
                {
                    "@id": "Bates33-001bT.jpg",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-001bT.jpg",
                    dateModified: "2023-03-28T23:49:04.000Z",
                    encodingFormat: "image/jpeg",
                },
                {
                    "@id": "Bates33-001bT.tei.xml",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-001bT.tei.xml",
                    dateModified: "2023-03-28T23:49:23.000Z",
                    encodingFormat: "application/xml",
                },
                {
                    "@id": "Bates33-001bT.thumbnail_h300.jpg",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-001bT.thumbnail_h300.jpg",
                    dateModified: "2023-03-28T23:49:03.000Z",
                    encodingFormat: "image/jpeg",
                },
                {
                    "@id": "Bates33-001bT.webp",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-001bT.webp",
                    dateModified: "2023-03-28T23:49:06.000Z",
                    encodingFormat: "image/webp",
                },
                {
                    "@id": "Bates33-digivol.csv",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-digivol.csv",
                    encodingFormat: "text/csv",
                },
                {
                    "@id": "Bates33-rights-holder-permission.pdf",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-rights-holder-permission.pdf",
                    encodingFormat: "application/pdf",
                },
                {
                    "@id": "Bates33-tei-complete.xml",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-tei-complete.xml",
                    dateModified: "2023-05-18T01:52:08.000Z",
                    encodingFormat: "application/xml",
                },
                {
                    "@id": "Bates33-language-authority-permission.pdf",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-language-authority-permission.pdf",
                },
                {
                    "@id": ".item-status.json",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: ".item-status.json",
                    dateModified: "2023-05-18T01:52:26.000Z",
                    encodingFormat: "application/json",
                },
                {
                    "@id": "LICENCE.md",
                    "@type": ["File", "DataReuselicence"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                        licence: {
                            "@id": "./",
                        },
                    },
                    name: "Open (subject to agreeing to PDSC access conditions)",
                    access: {
                        "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
                    },
                    authorizationWorkflow: {
                        "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms",
                    },
                },
                {
                    "@id": "Bates33-001.tei.xml",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-001.tei.xml",
                    dateModified: "2023-05-18T01:52:38.000Z",
                    encodingFormat: "application/xml",
                },
                {
                    "@id": "Bates33-002.tei.xml",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-002.tei.xml",
                    dateModified: "2023-05-18T01:52:39.000Z",
                    encodingFormat: "application/xml",
                },
                {
                    "@id": "Bates33-003.tei.xml",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-003.tei.xml",
                    dateModified: "2023-05-18T01:52:39.000Z",
                    encodingFormat: "application/xml",
                },
                {
                    "@id": "Bates33-tei.xml",
                    "@type": ["File"],
                    "@reverse": {
                        hasPart: {
                            "@id": "./",
                        },
                    },
                    name: "Bates33-tei.xml",
                    dateModified: "2023-05-18T01:52:39.000Z",
                    encodingFormat: "application/xml",
                },
                {
                    "@id": "#Marco_La_Rosa",
                    "@type": ["Person"],
                    "@reverse": {
                        depositor: {
                            "@id": "./",
                        },
                    },
                    name: "Marco La Rosa",
                },
                {
                    "@id": "https://catalog.nyingarn.net/collections/collection",
                    "@type": ["URL"],
                    "@reverse": {
                        memberOf: {
                            "@id": "./",
                        },
                    },
                    name: "https://catalog.nyingarn.net/collections/collection",
                },
                {
                    "@id": "https://collection.aiatsis.gov.au/austlang/language/D2",
                    "@type": ["Language"],
                    "@reverse": {
                        subjectLanguage: {
                            "@id": "./",
                        },
                    },
                    name: "Yorta Yorta ",
                    languageCode: "D2",
                    geo: {
                        "@id": "#Yorta Yorta ",
                    },
                    source: "Austlang",
                    alternateName: [
                        "Yota Yota",
                        "Bangerang",
                        "Jotijota",
                        "Yoda Yoda",
                        "Arramouro",
                        "Benhedore",
                        "Jabulajabula",
                        "Jodajoda",
                        "Moira",
                        "Narinari",
                        "Ngarimawuru",
                        "Ngarrimouro",
                        "Ngarrimowra",
                        "Wollithiga",
                        "Woollathura",
                        "Yabulayabula",
                        "Yoorta",
                        "Yorta yorta",
                        "Yotayota",
                        "Joda Joda",
                        "Yotta Yotta",
                        "Yabola",
                        "Yota yota",
                        "Yota",
                        "Gunbowers",
                        "Gunbowerooranditchgoole",
                        "Loddon tribe",
                        "Ngarrimowro",
                        "Wol lithiga",
                        "Echuca tribe",
                    ],
                },
                {
                    "@id": "https://ror.org/01ej9dk98",
                    "@type": ["Organization"],
                    "@reverse": {
                        holdingInstitution: {
                            "@id": "./",
                        },
                    },
                    name: "University of Melbourne",
                },
                {
                    "@id": "#entity-1",
                    "@type": ["Thing"],
                    "@reverse": {
                        dateModified: [
                            {
                                "@id": "Bates33-digivol.csv",
                            },
                            {
                                "@id": "Bates33-language-authority-permission.pdf",
                            },
                        ],
                    },
                    name: "entity-1",
                },
                {
                    "@id": "#entity-2",
                    "@type": ["Thing"],
                    "@reverse": {
                        dateModified: {
                            "@id": "Bates33-rights-holder-permission.pdf",
                        },
                    },
                    name: "entity-2",
                },
                {
                    "@id": "#Yorta Yorta ",
                    "@type": ["GeoCoordinates"],
                    "@reverse": {
                        geo: {
                            "@id": "https://collection.aiatsis.gov.au/austlang/language/D2",
                        },
                    },
                    name: "Geographical coverage for Yorta Yorta ",
                    geojson:
                        '{"type":"Feature","properties":{"name":"Yorta Yorta "},"geometry":{"type":"Point","coordinates":["145.26357989848","-36.093929709321"]}}',
                },
                {
                    "@id": "http://purl.archive.org/language-data-commons/terms#OpenAccess",
                    "@type": ["URL"],
                    "@reverse": {
                        access: {
                            "@id": "LICENCE.md",
                        },
                    },
                    name: "http://purl.archive.org/language-data-commons/terms#OpenAccess",
                },
                {
                    "@id": "http://purl.archive.org/language-data-commons/terms#AgreeToTerms",
                    "@type": ["URL"],
                    "@reverse": {
                        authorizationWorkflow: {
                            "@id": "LICENCE.md",
                        },
                    },
                    name: "http://purl.archive.org/language-data-commons/terms#AgreeToTerms",
                },
            ],
        };

        const client = new Client({
            node: configuration.api.services.elastic.host,
        });

        let indices = await client.cat.indices({ format: "JSON" });
        indices = indices.map((i) => i.index).join(",");
        if (indices) await client.indices.delete({ index: indices });

        await indexItem({
            item: { identifier, type: "item" },
            crate,
        });
    });
});
