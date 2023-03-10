<template>
    <div class="flex flex-col">
        <FileUploadComponent
            :filename-pattern="['-rights-holder-permission.pdf']"
            :show-upload="false"
            @file-uploaded="$emit('permission-loaded')"
        />
        <div class="">
            Upload the rights holder permission: '{{ identifier }}-rights-holder-permission.pdf'
        </div>
    </div>
</template>

<script setup>
import FileUploadComponent from "../UploadComponent/FileUpload.component.vue";
import { reactive, computed } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const identifier = computed(() => $route.params.identifier);

const $emit = defineEmits(["permission-loaded"]);
const data = reactive({
    rightsHolderPermissionLoaded: undefined,
});
</script>
