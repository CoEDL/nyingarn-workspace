<template>
    <div class="flex flex-col space-y-10">
        <AwaitingReviewItemsComponent />
        <AwaitingReviewCollectionsComponent />
    </div>
</template>

<script setup>
import AwaitingReviewCollectionsComponent from "./AwaitingReviewCollections.component.vue";
import AwaitingReviewItemsComponent from "./AwaitingReviewItems.component.vue";
</script>
