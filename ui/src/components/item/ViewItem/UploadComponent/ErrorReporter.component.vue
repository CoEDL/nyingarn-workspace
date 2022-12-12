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
            <div v-if="data.error.url" class="my-2 text-blue-600">
                <a :href="data.error.url" target="_blank">
                    For more information see this link: {{ data.error.url }}.
                </a>
            </div>
            <pre class="text-sm w-full">

    When reporting this problem to us please include the following information in the message (and send us the file that caused the error):

    item: {{ props.identifier }}
    file: {{ props.error.resource }}
    error: {{ data.error.message }}
            </pre>

            <pre v-if="data.error.code && data.error.sourceType">
    // Admin information
    name: {{ data.error.name }}
    code: {{ data.error.code }}
    sourceType: {{ data.error.sourceType }}
    xsltLineNumber: {{ data.error.xsltLineNumber }}
    xsltModule: {{ data.error.xsltModule }}
            </pre>
        </div>
    </div>
</template>

<script setup>
import { reactive } from "vue";
import { cloneDeep } from "lodash";

const props = defineProps({
    error: {
        type: Object,
        required: true,
    },
    identifier: {
        type: String,
        required: true,
    },
});
const data = reactive({
    show: false,
    error: cloneDeep(props.error.data),
});
</script>

<style scoped>
pre {
    white-space: pre-wrap;
}
</style>
