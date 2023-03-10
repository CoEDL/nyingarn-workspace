<template>
    <div class="my-2 flex flex-col space-y-4 control-height overflow-scroll">
        <UploadTranscriptionComponent />
        <UploadImagesComponent />
    </div>
</template>

<script setup>
import UploadTranscriptionComponent from "./UploadTranscription.component.vue";
import UploadImagesComponent from "./UploadImages.component.vue";
</script>

<style scoped>
.panel-height {
    height: 500px;
}
.control-height {
    max-height: calc(100vh - 150px);
}
</style>
