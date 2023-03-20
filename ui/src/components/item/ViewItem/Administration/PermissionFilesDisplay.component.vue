<template>
    <div class="flex flex-col space-y-2 bg-blue-100 p-4">
        <div class="border-l-2 pl-2 flex flex-row space-x-4">
            <div class="flex flex-row space-x-2" v-if="data.rightsHolderPermissionLoaded">
                <div>
                    <el-button
                        @click="deletePermissionForm('rightsHolderPermission')"
                        type="danger"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </el-button>
                </div>
                <a
                    class="underline"
                    :href="data.rightsHolderPermissionLoaded"
                    v-if="data.rightsHolderPermissionLoaded"
                >
                    <i class="fa-regular fa-file-pdf"></i>&nbsp;Download the Rights Holder
                    Permission
                </a>
            </div>
            <div v-else>Rights Holder Permission has not been loaded</div>
        </div>
        <div class="border-l-2 pl-2 flex flex-row space-x-4">
            <div class="flex flex-row space-x-2" v-if="data.languageAuthorityPermissionLoaded">
                <div>
                    <el-button
                        @click="deletePermissionForm('languageAuthorityPermission')"
                        type="danger"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </el-button>
                </div>
                <a class="underline" :href="data.languageAuthorityPermissionLoaded">
                    <i class="fa-regular fa-file-pdf"></i>&nbsp;Download the Language Authority
                    Permission
                </a>
            </div>
            <div v-else>Language Authority Permission has not been loaded</div>
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

async function deletePermissionForm(form) {
    if (form === "rightsHolderPermission") {
        form = `${identifier.value}-rights-holder-permission.pdf`;
        data.rightsHolderPermissionLoaded = undefined;
    } else {
        form = `${identifier.value}-language-authority-permission.pdf`;
        data.languageAuthorityPermissionLoaded = undefined;
    }
    let response = await $http.delete({
        route: `/items/${identifier.value}/permission-forms/${form}`,
    });
    if (response.status === 200) getItemPermissionForms();
}
</script>
