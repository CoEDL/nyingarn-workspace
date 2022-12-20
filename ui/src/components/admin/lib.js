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
