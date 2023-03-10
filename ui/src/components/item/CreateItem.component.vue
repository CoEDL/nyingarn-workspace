<template>
    <div>
        <div @click="data.createNewItem = !data.createNewItem" class="cursor-pointer">
            <i class="fa-solid fa-file-image"></i> Create item
        </div>
        <el-dialog
            title="Create a new Item"
            v-model="data.createNewItem"
            width="80%"
            destroy-on-close
        >
            <div class="flex flex-col space-y-2 text-gray-600" v-loading="data.loading">
                <div class="flex flex-row">
                    <div class="flex-grow"></div>
                    <div v-if="data.error?.statusCode" class="text-red-800">
                        Error: {{ data.error.message }}
                    </div>
                </div>
                <div class="w-full">
                    <el-form
                        :model="data.form"
                        label-width="120px"
                        @submit.prevent="createItemEntry"
                    >
                        <el-form-item label="Identifier" required>
                            <el-input
                                :autofocus="true"
                                placeholder="item identifier"
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
                                @click="createItemEntry"
                                :disabled="!data.identifier.length || data.error"
                            >
                                Create this item
                            </el-button>
                        </el-form-item>
                    </el-form>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script setup>
import { createItem } from "./item-services";
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
    createNewItem: false,
    error: false,
    help: $store.state.configuration.ui.itemName.help,
});
function checkNameStructure() {
    if ($store.state.configuration.ui.itemName?.checkNameStructure) {
        let regex = new RegExp($store.state.configuration.ui.itemName.checkNameStructure);
        if (!data.identifier.match(regex)) {
            data.error = true;
        } else {
            data.error = false;
        }
    }
}
async function createItemEntry() {
    data.loading = true;
    let response = await createItem({ $http, identifier: data.identifier });
    if (response.status === 200) {
        data.error = false;
        data.createNewItem = false;
        $router.push(`/items/${data.identifier}`);
        data.identifier = "";
    } else {
        data.identifier = "";
        data.error = await response.json();
    }
    data.loading = false;
}
</script>
