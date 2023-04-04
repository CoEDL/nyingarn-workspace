<template>
    <div class="flex flex-col space-y-2 p-4">
        <my-items-component v-if="canUpload" />
        <my-collections-component v-if="canUpload" />
        <div v-if="!canUpload"><terms-and-conditions-component /></div>
    </div>
</template>

<script>
import MyItemsComponent from "./MyItems.component.vue";
import MyCollectionsComponent from "./MyCollections.component.vue";
import TermsAndConditionsComponent from "./TermsAndConditions.component.vue";
export default {
    components: {
        MyItemsComponent,
        MyCollectionsComponent,
        TermsAndConditionsComponent,
    },
    computed: {
        canUpload() {
            return this.$store.state.user.upload;
        },
    },
};
</script>
