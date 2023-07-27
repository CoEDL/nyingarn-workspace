<template>
    <div class="flex flex-col space-y-4">
        <IndexItemComponent />
        <DeleteItemComponent />
    </div>
</template>

<script setup>
import IndexItemComponent from "./IndexItem.component.vue";
import DeleteItemComponent from "./DeleteItem.component.vue";
</script>
