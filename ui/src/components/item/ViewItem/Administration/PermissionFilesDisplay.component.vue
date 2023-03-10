<template>
    <div class="flex flex-col space-y-2 bg-blue-100 p-4">
        <div class="border-l-2 pl-2 flex flex-row space-x-4">
            <a
                class="underline"
                :href="data.rightsHolderPermissionLoaded"
                v-if="data.rightsHolderPermissionLoaded"
            >
                <i class="fa-regular fa-file-pdf"></i>&nbsp;Download the Rights Holder Permission
            </a>
        </div>
        <div class="border-l-2 pl-2 flex flex-row space-x-4">
            <a
                class="underline"
                :href="data.languageAuthorityPermissionLoaded"
                v-if="data.languageAuthorityPermissionLoaded"
            >
                <i class="fa-regular fa-file-pdf"></i>&nbsp;Download the Language Authority
                Permission
            </a>
        </div>
    </div>
</template>

<script setup>
import { reactive, computed, inject, onMounted } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");
const identifier = computed(() => $route.params.identifier);

const data = reactive({
    permissionForms: [],
    rightsHolderPermissionLoaded: undefined,
    languageAuthorityPermissionLoaded: undefined,
});

onMounted(() => {
    getItemPermissionForms();
});

async function getItemPermissionForms() {
    let response = await $http.get({ route: `/items/${identifier.value}/permission-forms` });
    response = await response.json();

    for (let form of response.files) {
        let response = await $http.get({
            route: `/items/${identifier.value}/resources/${form.name}/link`,
        });
        let { link } = await response.json();
        if (form.name.match(/-rights-holder-permission\.pdf/))
            data.rightsHolderPermissionLoaded = link;
        if (form.name.match(/-language-authority-permission\.pdf/))
            data.languageAuthorityPermissionLoaded = link;
    }
}
</script>
