<template>
    <div>
        <!-- <el-button type="primary" @click="saveCrate(data)">
            Save
        </el-button> -->
        <div :style="{ height: metadataPanelHeight }" class="overflow-scroll">
            <crate-editor :crate="data.crate" :mode="mode" @ready="ready" @update:crate="ready"></crate-editor>
        </div>

        <!-- <describo-crate-builder
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
            @error="handleErrors"
            @warning="handleWarnings"
            @navigation="updateRoute"
        >
        </describo-crate-builder> -->
        <el-dialog v-model="data.dialogVisible" title="Metadata error" width="50%">
            <div class="flex flex-col items-center space-y-4">
                <div>
                    Unfortunately, there is an unrecoverable issue with the metadata for this item.
                </div>
                <div>
                    <el-button type="primary" @click="loadCrate({ reset: true })">
                        click here to reset the metadata
                    </el-button>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import {CrateEditor} from 'crate-o';
import mode from 'ro-crate-modes/modes/base.json';
import 'crate-o/css'

import { reactive, onMounted, onBeforeUnmount, inject, watch, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ElMessage, ElDialog, ElButton } from "element-plus";
import { Lookup } from "./lookup.js";
import isEmpty from "lodash-es/isEmpty.js";
import flattenDeep from "lodash-es/flattenDeep";
const $route = useRoute();
const $router = useRouter();
const $http = inject("$http");
const lookup = new Lookup({ $http });


function ready() {
    console.log('updated')
}
let props = defineProps({
    identifier: {
        type: String,
    },
});

let data = reactive({
    dialogVisible: false,
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
    return `${window.innerHeight - 150}px`;
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
    await loadCrate({});
}

async function loadCrate({ reset = false }) {
    let response = await $http.get({
        route: `/describo/rocrate/${$route.meta.type}/${$route.params.identifier}`,
        params: { reset },
    });
    if (response.status !== 200) {
        ElMessage.error(`Unable to retrieve RO Crate file`);
    }
    data.crate = (await response.json()).crate;
    data.dialogVisible = false;
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
function handleErrors({ errors }) {
    console.log("errors", errors);
    if (flattenDeep(Object.keys(errors).map((errorType) => errors[errorType].data)).length > 0) {
        data.dialogVisible = true;
    }
}
function handleWarnings({ warnings }) {
    console.log("warnings", warnings);
}
</script>
