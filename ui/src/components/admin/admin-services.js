let $http;
export async function getAwaitingReview() {
    const router = await import("../../routes.js");
    const HTTPService = (await import("../../http.service.js")).default;
    $http = new HTTPService({ router });
    return await Promise.all([getItemsAwaitingReview(), getCollectionsAwaitingReview()]);
}

async function getItemsAwaitingReview() {
    let response = await $http.get({ route: "/admin/items/awaiting-review" });
    if (response.status === 200) {
        response = await response.json();
        let items = response.items;
        items = items.map((item) => {
            item.version = {
                metadata: false,
                documents: true,
                images: false,
            };
            return item;
        });
        return items;
    }
}
async function getCollectionsAwaitingReview() {
    let response = await $http.get({ route: "/admin/collections/awaiting-review" });
    if (response.status === 200) {
        response = await response.json();
        let collections = response.collections;
        collections = collections.map((collection) => {
            collection.version = {
                metadata: false,
            };
            return collection;
        });
        return collections;
    }
}
