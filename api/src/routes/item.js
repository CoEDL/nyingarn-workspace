import { BadRequestError, ConflictError } from "restify-errors";
import { loadConfiguration } from "../common";
import { route } from "../middleware";
import { createItem, linkItemToUser, lookupItemByIdentifier } from "../lib/item";

export function setupRoutes({ server }) {
    server.post("/item", route(createNewItem));
}

async function createNewItem(req, res, next) {
    if (!req.body.identifier) {
        return next(new BadRequestError(`itemId not defined`));
    }
    // is that identifier already in use?
    let item = await lookupItemByIdentifier({ identifier: req.body.identifier });
    if (!item) {
        // no - create the item
        item = await createItem({ identifier: req.body.identifier });

        // and link the item to the user
        await linkItemToUser({ itemId: item.id, userId: req.session.user.id });
    } else {
        // the identifier is already taken
        let users = item.users.map((u) => u.id);
        if (!users.includes(req.session.user.id)) {
            // the item exists but does not belong to the user
            return next(new ConflictError(`That identifier is taken`));
        }
    }

    res.send({ item: item.get() });
    next();
}
