<template>
    <div class="flex flex-col">
        <PermissionFilesDisplayComponent />
        <invite-user-component class="bg-gray-200 p-4 my-2" />
        <reprocess-transcriptions-imports class="bg-gray-200 p-4 my-2" />
        <copy-crate-from-component type="items" class="bg-gray-200 p-4 my-2" />
    </div>
</template>

<script setup>
import InviteUserComponent from "./InviteUser.component.vue";
import ReprocessTranscriptionsImports from "./ReprocessTranscriptionsImports.component.vue";
import CopyCrateFromComponent from "../../../CopyCrateFrom.component.vue";
import PermissionFilesDisplayComponent from "./PermissionFilesDisplay.component.vue";
</script>
