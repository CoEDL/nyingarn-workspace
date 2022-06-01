<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <div>
                Error processing file:
                <span class="text-red-600">{{ error.resource }}</span>
            </div>
            <div class="ml-4">
                <el-button @click="show = !show" size="small">
                    <i class="fa-solid fa-chevron-right"></i>
                </el-button>
            </div>
        </div>
        <div v-if="show">
            <pre class="text-sm w-full">

    When reporting this problem to us please include the following: 
    
    item: {{ $route.params.identifier }}
    file: {{ error.resource }} 
    error: {{ error.data.error }}

    Be sure to include the file that caused the error.
            </pre>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        error: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            show: false,
        };
    },
};
</script>

<style scoped>
pre {
    white-space: pre-wrap;
}
</style>
