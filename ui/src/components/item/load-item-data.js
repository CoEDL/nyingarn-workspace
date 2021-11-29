// test-001-ADMIN_thumbnail_h300.jpg
// test-001-ADMIN_tesseract_ocr.txt
// test-001-ADMIN_ftp_ocr.txt
// test-001-ADMIN_content.txt
// test-001-ADMIN_content_tei.xml

import { groupBy } from "lodash";

export async function getItemResources({ $http, identifier }) {
    let response = await $http.get({ route: `/items/${identifier}/resources` });
    if (response.status !== 200) {
        console.error(`Error getting item resources`, response.status, await response.json());
    }
    let resources = (await response.json()).resources;
    resources = resources.filter((resource) => !["ro-crate-metadata.json"].includes(resource));
    resources = groupBy(resources, (resource) => resource.split(".")[0].split("-ADMIN")[0]);
    return { resources };
}

export async function getResourceObjects({ $http, identifier, resource }) {
    let resources = (await getItemResources({ $http, identifier })).resources;
    return { objects: resources[resource] };
}
