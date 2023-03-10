<template>
    <div class="flex flex-col space-y-2 panel-height overflow-scroll">
        <InfoBoxComponent
            text-align="center"
            msg=" When you publish, the collection will be flagged for review by an administrator
                prior to ingestion into the repository."
        />

        <PublicationFormComponent />
    </div>
</template>

<script setup>
import PublicationFormComponent from "./PublicationForm.component.vue";
import InfoBoxComponent from "../../../InfoBox.component.vue";
import { reactive } from "vue";

const data = reactive({
    loading: false,
    rightsHolderPermissionLoaded: false,
    languageAuthorityPermissionLoaded: false,
    checked: [],
});
</script>

<style scoped>
.panel-height {
    height: calc(100vh - 150px);
}
</style>
