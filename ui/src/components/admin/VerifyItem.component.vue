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

const data = reactive({
    loading: false,
});
async function verifyItem() {
    data.loading = true;
    let response = await verifyItemResources({
        $http,
        identifier: $route.params.identifier,
    });
    console.log("done");
    // ElMessage({
    //     message: "Reprocessing tasks have been submitted. They should complete soon.",
    //     type: "success",
    // });
    data.loading = false;
}
</script>
