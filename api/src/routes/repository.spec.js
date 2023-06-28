require("regenerator-runtime");
import { createSession } from "../lib/session.js";
import Chance from "chance";
const chance = Chance();
import fetch from "cross-fetch";
import {
    loadConfiguration,
    getStoreHandle,
    TestSetup,
    headers,
    host,
    setupTestItem,
    setupTestCollection,
    getS3Handle,
} from "../common/index.js";
import models from "../models/index.js";
import { importRepositoryContentFromStorageIntoTheDb } from "../lib/repository.js";
import { Client } from "@elastic/elasticsearch";

describe("Repository route tests", () => {
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

    it("should be able to lookup repository items and index them", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "item",
            location: "repository",
        });
        await store.createObject();

        //  setup as a normal user
        let user = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store, user });

        const configuration = await loadConfiguration();
        await importRepositoryContentFromStorageIntoTheDb({ user, configuration });

        // connect as user
        let session = await createSession({ user });

        // lookup repo items
        let response = await fetch(`${host}/repository/lookup-content`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        let { items, total } = await response.json();
        expect(items.length).toEqual(1);
        expect(total).toEqual(1);

        const item = items[0];
        response = await fetch(`${host}/repository/index/${item.id}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

        const client = new Client({
            node: configuration.api.services.elastic.host,
        });
        let document = await client.get({
            index: "metadata",
            id: `/item/${item.identifier}`,
        });
        expect(document._source).toMatchObject({
            "@id": "./",
            "@type": ["Dataset"],
            name: ["My Research Object Crate"],
        });

        await models.repoitem.destroy({ where: { identifier } });
        await store.removeObject();
    });
    it("should be able to index all repository items", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "item",
            location: "repository",
        });
        await store.createObject();

        //  setup as an admin user
        let user = users.filter((u) => u.administrator)[0];
        await setupTestItem({ identifier, store, user });

        const configuration = await loadConfiguration();
        await importRepositoryContentFromStorageIntoTheDb({ user, configuration });

        // connect as user
        let session = await createSession({ user });

        // index all repository items
        let response = await fetch(`${host}/repository/index-all-content`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);

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
            name: ["My Research Object Crate"],
        });

        await models.repoitem.destroy({ where: { identifier } });
        await store.removeObject();
    });
    it("should be able to interact with an item in the repository", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "item",
            location: "repository",
        });
        await store.createObject();
        for (let file of [
            `${identifier}-001.jpg`,
            `${identifier}-001.webp`,
            `${identifier}-001.thumbnail_h300.jpg`,
            `${identifier}-tei-complete.xml`,
            `LICENCE.md`,
            `${identifier}-language-authority-permission.pdf`,
            `${identifier}-rights-holder-permission.pdf`,
        ]) {
            await store.put({ target: file, json: {} });
        }
        await store.put({
            target: `${identifier}-001.tei.xml`,
            content: "<tei></tei>",
        });

        // put the identifier into the crate file so that we can search for it later
        let crateFile = await store.getJSON({ target: "ro-crate-metadata.json" });
        crateFile["@graph"][1].name = identifier;
        await store.put({ target: "ro-crate-metadata.json", json: crateFile });

        //  setup as an admin user
        let user = users.filter((u) => u.administrator)[0];
        let session = await createSession({ user });

        // register the item in the db
        let item = await models.repoitem.create({ identifier, type: "item" });

        // index the item so that we can test for it
        let response = await fetch(`${host}/repository/index/${item.id}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();

        // test that we can get the metadata
        response = await fetch(`${host}/repository/item/${identifier}`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.crate).toMatchObject({});

        // test that we can get the thumbnails
        response = await fetch(`${host}/repository/item/${identifier}/thumbnails`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response.total).toEqual(1);
        expect(response.thumbnails).toMatchObject([
            {
                name: `${identifier}-001`,
                filename: `${identifier}-001.thumbnail_h300.jpg`,
            },
        ]);

        // test that we can get the item resources
        response = await fetch(`${host}/repository/item/${identifier}/resources`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response).toMatchObject({
            resources: [{ name: `${identifier}-001`, page: 1, total: 1 }],
            total: 1,
        });

        // test that we can get a single resource
        response = await fetch(`${host}/repository/item/${identifier}/${identifier}-001`, {
            method: "GET",
            headers: headers(session),
        });
        expect(response.status).toEqual(200);
        response = await response.json();
        expect(response).toMatchObject({
            imageUrl: /http:\/\/s3:9000\/testing\/nyingarn.net\/repository.*/,
            document: /<?xml.*/,
        });

        // test that we can execute a query against the index and find this item
        // response = await fetch(`${host}/repository/search?query=${identifier}`, {
        //     method: "GET",
        //     headers: headers(session),
        // });
        // expect(response.status).toEqual(200);
        // response = await response.json();
        // console.log(response);

        await models.repoitem.destroy({ where: { identifier } });
        await store.removeObject();
    });
});
