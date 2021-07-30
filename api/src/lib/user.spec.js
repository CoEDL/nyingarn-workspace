require("regenerator-runtime");
const { getUsers } = require("./user");
describe("User management tests", () => {
    it("should be able to get a list of users", async () => {
        let users = await getUsers();
        expect(users.length).toEqual(2);
    });

    it("should be able to get a specified user", async () => {});
    it("should be able to create a new user", async () => {});
    it("should be able to delete a user", async () => {});
});
