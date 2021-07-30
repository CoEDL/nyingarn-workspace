import models from "../models";
export async function setupApplications({ applications }) {
    for (let app of applications) {
        await models.application.findOrCreate({
            where: {
                name: app.name,
                origin: app.origin,
            },
            defaults: {
                name: app.name.app,
                origin: app.origin,
                secret: app.secret,
            },
        });
    }
}
