<template>
    <div class="flex flex-col">
        <invite-user-component class="bg-gray-200 p-4 my-2" />
        <copy-crate-from-component type="collections" class="bg-gray-200 p-4 my-2" />
    </div>
</template>

<script setup>
import InviteUserComponent from "./InviteUser.component.vue";
import CopyCrateFromComponent from "../../../CopyCrateFrom.component.vue";
</script>
