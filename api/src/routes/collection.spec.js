require("regenerator-runtime");
import { createUser } from "../lib/user";
import { deleteCollection } from "../lib/collection";
import { createSession } from "../lib/session";
const chance = require("chance").Chance();
import fetch from "node-fetch";
import { getS3Handle } from "../common";
import models from "../models";
import {
    host,
    setupBeforeAll,
    setupBeforeEach,
    teardownAfterAll,
    teardownAfterEach,
    setupTestItem,
} from "../common";

describe("Collection management route tests", () => {
    let configuration, users, bucket, session, user;
    const userEmail = chance.email();
    const adminEmail = chance.email();
    beforeAll(async () => {
	configuration = await setupBeforeAll({ adminEmails: [adminEmail] });
	({ bucket } = await getS3Handle());
    });
    beforeEach(async () => {
	users = await setupBeforeEach({ emails: [userEmail], adminEmails: [adminEmail] });
	session = await createSession({ user: users[0] });
    });
    afterEach(async () => {
	await teardownAfterEach({ users });
    });
    afterAll(async () => {
	await teardownAfterAll(configuration);
    });
    it("should be able to create a new collection as an administrator", async () => {
	let user = {
	    email: adminEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);

	let session = await createSession({ user });

	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);
	let { collection } = await response.json();
	expect(collection.identifier).toEqual(identifier);

	await deleteCollection({ id: collection.id });
	await user.destroy();
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to create a new collection as a normal user", async () => {
	let user = {
	    email: userEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);

	let session = await createSession({ user });

	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);
	let { collection } = await response.json();
	expect(collection.identifier).toEqual(identifier);

	await deleteCollection({ id: collection.id });
	await bucket.removeObjects({ prefix: identifier });
    });
    it("should be able to invite a user to own item", async () => {
	let user = {
	    email: userEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);
	let user2 = {
	    email: adminEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user2 = await createUser(user2);

	let session = await createSession({ user });

	// create an item
	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);
	let { collection } = await response.json();

	// invite user 2 to item
	response = await fetch(`${host}/collections/${identifier}/attach-user`, {
	    method: "PUT",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		email: user2.email,
	    }),
	});
	expect(response.status).toEqual(200);

	let links = await models.collection_user.findAll();
	expect(links.length).toEqual(2);

	await deleteCollection({ id: collection.id });
	await user.destroy();
	await user2.destroy();
	await models.log.destroy({ where: {} });
    });
    it("should be able to detach a user from a collection", async () => {
	let user = {
	    email: userEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);
	let user2 = {
	    email: adminEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user2 = await createUser(user2);

	let session = await createSession({ user });

	// create an item
	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);
	let { collection } = await response.json();

	// invite user 2 to item
	response = await fetch(`${host}/collections/${identifier}/attach-user`, {
	    method: "PUT",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		email: user2.email,
	    }),
	});
	expect(response.status).toEqual(200);

	// connect as admin and detach the first user
	session = await createSession({ user });
	response = await fetch(`${host}/collections/${identifier}/detach-user`, {
	    method: "PUT",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		userId: user.id,
	    }),
	});
	expect(response.status).toEqual(200);

	let links = await models.collection_user.findAll();
	expect(links.length).toEqual(1);

	// should fail to detach self as admin
	response = await fetch(`${host}/collections/${identifier}/detach-user`, {
	    method: "PUT",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		userId: user2.id,
	    }),
	});
	expect(response.status).toEqual(403);

	await deleteCollection({ id: collection.id });
	await user.destroy();
	await user2.destroy();
	await models.log.destroy({ where: {} });
    });
    it("should be able to get a list of collection users", async () => {
	let user = {
	    email: userEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);
	let user2 = {
	    email: adminEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user2 = await createUser(user2);

	let session = await createSession({ user });

	// create an item
	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);
	let { collection } = await response.json();

	// invite user 2 to item
	response = await fetch(`${host}/collections/${identifier}/attach-user`, {
	    method: "PUT",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		email: user2.email,
	    }),
	});
	expect(response.status).toEqual(200);

	// get list of users
	response = await fetch(`${host}/collections/${identifier}/users`, {
	    method: "GET",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	});
	expect(response.status).toEqual(200);
	let { users } = await response.json();
	expect(users.length).toEqual(2);

	await deleteCollection({ id: collection.id });
	await user.destroy();
	await user2.destroy();
	await models.log.destroy({ where: {} });
    });
    it("should be able to delete own collection as a user", async () => {
	let user = {
	    email: userEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);

	let session = await createSession({ user });

	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);

	response = await fetch(`${host}/collections/${identifier}`, {
	    method: "DELETE",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({ identifier }),
	});
	expect(response.status).toEqual(200);
    });
    it("should be able to get own collections", async () => {
	let user = {
	    email: userEmail,
	    givenName: chance.word(),
	    familyName: chance.word(),
	    provider: chance.word(),
	};
	user = await createUser(user);

	let session = await createSession({ user });

	const identifier = chance.word();
	let response = await fetch(`${host}/collections`, {
	    method: "POST",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	    body: JSON.stringify({
		identifier,
	    }),
	});
	expect(response.status).toEqual(200);
	let { collection } = await response.json();

	response = await fetch(`${host}/collections`, {
	    method: "GET",
	    headers: {
		authorization: `Bearer ${session.token}`,
		"Content-Type": "application/json",
	    },
	});
	expect(response.status).toEqual(200);
	let { total, collections } = await response.json();
	expect(total).toEqual(1);

	await deleteCollection({ id: collection.id });
	await bucket.removeObjects({ prefix: identifier });
    });
});
