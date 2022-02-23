export async function getResourceFiles({ $http, identifier, resource }) {
    return await $http.get({
        route: `/items/${identifier}/resources/${resource}/files`,
    });
}

export async function getStatus({ $http, identifier, resourc }) {
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
