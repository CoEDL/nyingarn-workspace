require("regenerator-runtime");
import Chance from "chance";
const chance = Chance();
import { loadConfiguration, getStoreHandle, getS3Handle, TestSetup } from "../common/index.js";
import models from "../models/index.js";
import {
    importRepositoryContentFromStorageIntoTheDb,
    getRepositoryItems,
    indexRepositoryItem,
} from "./repository.js";
import { Client } from "@elastic/elasticsearch";

describe("Repository management tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
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

        await indexRepositoryItem({
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
});
