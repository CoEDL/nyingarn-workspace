<template>
    <div>
        <div @click="data.createNewCollection = !data.createNewCollection" class="cursor-pointer">
            <span class="fa-layers fa-fw">
                <i class="fa-solid fa-file-image" data-fa-transform="left-4 up-4"></i>
                <i class="fa-solid fa-file-image" data-fa-transform="right-4 down-4"></i>
            </span>
            Create collection
        </div>
        <el-dialog
            title="Create a new Collection"
            v-model="data.createNewCollection"
            width="80%"
            destroy-on-close
        >
            <div class="flex flex-col space-y-2 text-gray-600" v-loading="data.loading">
                <div class="flex flex-row">
                    <div class="text-sm text-gray-600">
                        Please define an identifier for this collection.
                    </div>
                    <div class="flex-grow"></div>
                    <div v-if="data.error?.code" class="text-red-800">
                        Error: {{ data.error.message }}
                    </div>
                </div>
                <div class="w-full" v-loading="data.loading">
                    <el-form
                        :model="data.form"
                        label-width="120px"
                        @submit.prevent="createCollectionEntry"
                    >
                        <el-form-item label="Collection" required>
                            <el-input
                                :autofocus="true"
                                placeholder="collection identifier"
                                v-model="data.identifier"
                                @input="checkNameStructure"
                            ></el-input>
                            <div
                                class="text-xs text-gray-600"
                                :class="{ 'text-red-600': data.error }"
                            >
                                {{ data.help }}
                            </div>
                        </el-form-item>
                        <el-form-item>
                            <el-button
                                type="primary"
                                @click="createCollectionEntry"
                                :disabled="!data.identifier.length || data.error"
                            >
                                Create this collection
                            </el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import { createCollection } from "./collection-services";
import { reactive, inject } from "vue";
import { useStore } from "vuex";
import { useRouter } from "vue-router";
const $store = useStore();
const $router = useRouter();
const $http = inject("$http");

const data = reactive({
    loading: false,
    identifier: "",
    form: {},
    createNewCollection: false,
    error: false,
    help: $store.state.configuration.ui.collectionName.help,
});
function checkNameStructure() {
    if ($store.state.configuration.ui.collectionName?.checkNameStructure) {
        let regex = new RegExp($store.state.configuration.ui.collectionName.checkNameStructure);
        if (!data.identifier.match(regex)) {
            data.error = true;
        } else {
            data.error = false;
        }
    }
}
async function createCollectionEntry() {
    data.loading = true;
    let response = await createCollection({ $http, identifier: data.identifier });
    if (response.status === 200) {
        data.error = false;
        data.createNewCollection = false;
        $router.push(`/collections/${data.identifier}`);
        data.identifier = "";
    } else {
        data.identifier = "";
        data.error = await response.json();
    }
    data.loading = false;
}
</script>
