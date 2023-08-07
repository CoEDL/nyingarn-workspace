<template>
    <div class="flex flex-col space-y-2">
        <PermissionFilesDisplayComponent />
        <invite-user-component class="bg-gray-200 p-4" :key="ts" />
        <reprocess-transcriptions-imports class="bg-gray-200 p-4" />
        <copy-crate-from-component
            type="items"
            @refresh="ts = new Date()"
            class="bg-gray-200 p-4"
        />
    </div>
</template>

<script setup>
import InviteUserComponent from "./InviteUser.component.vue";
import ReprocessTranscriptionsImports from "./ReprocessTranscriptionsImports.component.vue";
import CopyCrateFromComponent from "../../../CopyCrateFrom.component.vue";
import PermissionFilesDisplayComponent from "./PermissionFilesDisplay.component.vue";
import { ref } from "vue";

let ts = ref(new Date());
</script>
