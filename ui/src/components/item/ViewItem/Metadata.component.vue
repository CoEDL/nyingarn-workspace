<template>
    <describo-crate-builder
        :style="{ height: metadataPanelHeight }"
        class="overflow-scroll"
        :crate="data.crate"
        :profile="data.profile"
        :lookup="lookup"
        :entity-id="data.entityId"
        :enable-context-editor="false"
        :enable-crate-preview="true"
        :enable-browse-entities="true"
        :enable-internal-routing="false"
        :show-controls="true"
        :purge-unlinked-entities-before-save="true"
        tab-location="right"
        @save:crate="saveCrate"
        @navigation="updateRoute"
    >
    </describo-crate-builder>
</template>

<script setup>
import { reactive, onMounted, onBeforeUnmount, inject, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import { Lookup } from "../../lookup.js";
import isEmpty from "lodash-es/isEmpty.js";
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");
const lookup = new Lookup({ $http });

let props = defineProps({
    identifier: {
        type: String,
    },
});

let data = reactive({
    routeWatcher: undefined,
    entityId: undefined,
    crate: undefined,
    profile: undefined,
});
onMounted(() => {
    load();
    data.routeWatcher = watch(
        () => $route.query?.id,
        (n, o) => {
            if (n !== o && n !== undefined) data.entityId = decodeURIComponent(atob(n));
        }
    );
});
onBeforeUnmount(() => {
    data.routeWatcher();
});
const metadataPanelHeight = computed(() => {
    return `${window.innerHeight - 140}px`;
});

function updateRoute(entity) {
    const id = btoa(encodeURIComponent(entity["@id"]));
    if (isEmpty($route?.query)) {
        $router?.replace({ query: { id } });
    } else {
        $router?.push({ query: { id } });
    }
    data.entityId = id;
}
async function load() {
    if (!$route.meta.type && !$route.params.identifier) return;

    // load the profile
    let response = await $http.get({
        route: `/describo/profile/${$route.meta.type}`,
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to retrieve profile`);
    }
    response = await response.json();
    data.profile = response.profile;
    await new Promise((resolve) => setTimeout(resolve, 20));

    // load the crate file
    response = await $http.get({
        route: `/describo/rocrate/${$route.meta.type}/${$route.params.identifier}`,
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to retrieve RO Crate file`);
    }
    data.crate = (await response.json()).crate;
}
async function saveCrate(data) {
    let response = await $http.put({
        route: `/describo/rocrate/${$route.meta.type}/${$route.params.identifier}`,
        body: { data },
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to save RO Crate file`);
    }
    // console.log("SAVE CRATE", JSON.stringify(data, null, 2));
}
</script>
