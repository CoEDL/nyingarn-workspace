<template>
    <div class="flex flex-col">
        <FileUploadComponent
            :filename-pattern="['-language-authority-permission.pdf']"
            :show-upload="false"
            @file-uploaded="$emit('permission-loaded')"
        />
        <div class="ml-1 my-2">
            Upload the language authority permission: '{{
                identifier
            }}-language-authority-permission.pdf'
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
    languageAuthorityPermissionLoaded: undefined,
});
</script>
