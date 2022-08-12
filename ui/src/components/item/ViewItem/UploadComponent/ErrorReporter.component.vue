<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <div>
                Error processing file:
                <span class="text-red-600">{{ props.error.resource }}</span>
            </div>
            <div class="ml-4">
                <el-button @click="data.show = !data.show" size="small">
                    <i class="fa-solid fa-chevron-right"></i>
                </el-button>
            </div>
        </div>
        <div v-if="data.show">
            <pre class="text-sm w-full">

    When reporting this problem to us please include the following information in the message: 
    
    item: {{ $route.params.identifier }}
    file: {{ props.error.resource }} 
    error: {{ props.error.data.error }}

    And send us the file that caused the error.
            </pre>
        </div>
    </div>
</template>

<script setup>
import { reactive } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();

const props = defineProps({
    error: {
        type: Object,
        required: true,
    },
});
const data = reactive({
    show: false,
});
</script>

<style scoped>
pre {
    white-space: pre-wrap;
}
</style>
