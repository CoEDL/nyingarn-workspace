<template>
    <div v-loading="data.loading">
        <el-button type="warning" @click="verifyItem" :disabled="data.loading"> verify </el-button>
    </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { verifyItem as verifyItemResources } from "../item/item-services.js";
import { reactive, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const props = defineProps({
    resource: {
        type: Object,
        required: true,
    },
});

const data = reactive({
    loading: false,
});
async function verifyItem() {
    data.loading = true;
    let response = await verifyItemResources({
        $http,
        identifier: props.resource.identifier,
    });
    if (response.status === 200) {
        ElMessage({
            message: "Verification complete.",
            type: "success",
        });
    } else {
        ElMessage({
            message: "The item verification failed.",
            type: "error",
        });
    }
    data.loading = false;
}
</script>
