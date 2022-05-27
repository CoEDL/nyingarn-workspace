export async function getMyCollections({ $http, offset, limit }) {
    return await $http.get({
        route: `/collections`,
        params: { offset, limit },
    });
}

export async function getCollection({ $http, identifier }) {
    return await $http.get({
        route: `/collections/${identifier}`,
    });
}

export async function createCollection({ $http, identifier }) {
    return await $http.post({
        route: "/collections",
        body: { identifier },
    });
}

export async function deleteCollection({ $http, identifier }) {
    return await $http.delete({
        route: `/collections/${identifier}`,
    });
}

export async function attachUser({ $http, identifier, email }) {
    return await $http.put({
        route: `/collections/${identifier}/attach-user`,
        body: { email },
    });
}

export async function getCollectionUsers({ $http, identifier }) {
    return await $http.get({
        route: `/collections/${identifier}/users`,
    });
}

export async function detachUserFromCollection({ $http, identifier, userId }) {
    return await $http.put({
        route: `/collections/${identifier}/detach-user`,
        body: { userId },
    });
}

export async function toggleCollectionVisibility({ $http, identifier }) {
    return await $http.put({
        route: `/collections/${identifier}/toggle-visibility`,
        body: {},
    });
}
