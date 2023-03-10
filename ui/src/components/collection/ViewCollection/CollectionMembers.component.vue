<template>
    <div class="flex flex-col space-y-8">
        <LinkRelatedItemComponent property="hasMember" reverse-property="memberOf" />
        <LinkRelatedCollectionComponent property="hasMember" reverse-property="memberOf" />
    </div>
</template>

<script setup>
import LinkRelatedItemComponent from "./LinkRelatedItem.component.vue";
import LinkRelatedCollectionComponent from "./LinkRelatedCollection.component.vue";
</script>
