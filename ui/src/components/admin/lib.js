export async function loadItems({ $http, offset, prefix }) {
    const params = { offset };
    if (prefix) params.prefix = prefix;
    let response = await $http.get({
        route: "/admin/entries/items",
        params,
    });
    if (response.status === 200) {
        let { items, total } = await response.json();
        return { rows: items, total };
    } else {
        return { items: [], total: 0 };
    }
}
export async function loadCollections({ $http, offset, prefix }) {
    const params = { offset };
    if (prefix) params.prefix = prefix;
    let response = await $http.get({
        route: "/admin/entries/collections",
        params,
    });
    if (response.status === 200) {
        let { collections, total } = await response.json();
        return { rows: collections, total };
    } else {
        return { collections: [], total: 0 };
    }
}
export async function lookupRepositoryContent({ $http, offset, prefix }) {
    const params = { offset };
    if (prefix) params.prefix = prefix;
    let response = await $http.get({
        route: "/repository/lookup-content",
        params,
    });
    if (response.status === 200) {
        let { items, total } = await response.json();
        return { rows: items, total };
    } else {
        return { items: [], total: 0 };
    }
}
export async function indexRepositoryContent({ $http, id }) {
    let response = await $http.get({
        route: `/repository/index/${id}`,
    });
}
export async function deleteItemFromRepository({ $http, type, identifier }) {
    let response = await $http.delete({
        route: `/repository/${type}/${identifier}`,
    });
}
export async function connectItem({ $http, identifier }) {
    await $http.put({ route: `/admin/items/${identifier}/connect-user` });
}
export function loadItem({ $router, identifier }) {
    $router.push(`/items/${identifier}/view`);
}
export async function connectCollection({ $http, identifier }) {
    await $http.put({ route: `/admin/collections/${identifier}/connect-user` });
}
export function loadCollection({ $router, identifier }) {
    $router.push(`/collections/${identifier}/metadata`);
}
