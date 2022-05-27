export async function getItem({ $http, identifier }) {
    return await $http.get({
        route: `/items/${identifier}`,
    });
}

export async function createItem({ $http, identifier }) {
    return await $http.post({
        route: "/items",
        body: { identifier },
    });
}
export async function getItemResources({ $http, identifier, offset, limit }) {
    return await $http.get({
        route: `/items/${identifier}/resources`,
        params: { offset, limit },
    });
}

export async function getResourceFiles({ $http, identifier, resource }) {
    return await $http.get({
        route: `/items/${identifier}/resources/${resource}/files`,
    });
}

export async function getStatus({ $http, identifier, resource }) {
    return await $http.get({
        route: `/items/${identifier}/resources/${resource}/status`,
    });
}

export async function getFileUrl({ $http, identifier, file, download = false }) {
    return await $http.get({
        route: `/items/${identifier}/resources/${file}/link?download=${download}`,
    });
}

export async function deleteResource({ $http, identifier, resource }) {
    return await $http.delete({
        route: `/items/${identifier}/resources/${resource}`,
    });
}

export async function deleteResourceFile({ $http, identifier, resource, file }) {
    return await $http.delete({
        route: `/items/${identifier}/resources/${resource}/${file}`,
    });
}

export async function attachUser({ $http, identifier, email }) {
    return await $http.put({
        route: `/items/${identifier}/attach-user`,
        body: { email },
    });
}

export async function getItemUsers({ $http, identifier }) {
    return await $http.get({
        route: `/items/${identifier}/users`,
    });
}

export async function detachUserFromItem({ $http, identifier, userId }) {
    return await $http.put({
        route: `/items/${identifier}/detach-user`,
        body: { userId },
    });
}

export async function reprocessImports({ $http, identifier, userId }) {
    return await $http.put({
        route: `/items/${identifier}/reprocess-imports`,
    });
}
