require("regenerator-runtime");
import { registerAllFiles } from "./crate-tools.js";
const chance = require("chance").Chance();
import { TestSetup, setupTestItem } from "../common/test-utils.js";
import { getStoreHandle } from "../common/getS3Handle.js";
import { ROCrate } from "ro-crate";
import models from "../models";

describe("Crate tools tests", () => {
    let configuration, users, userEmail, adminEmail, bucket;
    let identifier, store;
    const tester = new TestSetup();

    beforeAll(async () => {
        ({ userEmail, adminEmail, configuration, bucket } = await tester.setupBeforeAll());
        users = await tester.setupUsers({ emails: [userEmail], adminEmails: [adminEmail] });
    });
    beforeEach(async () => {
        identifier = chance.word();
    });
    afterAll(async () => {
        await tester.purgeUsers({ users });
        await tester.teardownAfterAll(configuration);
    });
    it("should be able to register all item files in the crate", async () => {
        let store = await getStoreHandle({
            id: identifier,
            type: "item",
        });
        //  setup as a normal user
        let user = users.filter((u) => !u.administrator)[0];
        await setupTestItem({ identifier, store, user });
        let crate = await store.getJSON({ target: "ro-crate-metadata.json" });
        crate = new ROCrate(crate, { array: true });

        let resources = await store.listResources();

        await registerAllFiles({ crate, resources });
        expect(crate.rootDataset.hasPart.length).toBe(5);

        await models.item.destroy({ where: { identifier } });
        await store.removeObject();
    });
});
