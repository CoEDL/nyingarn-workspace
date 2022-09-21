<template>
    <div class="flex flex-col space-y-2 p-4 xl:flex-row xl:space-x-2 xl:space-y-0">
        <my-items-component class="xl:w-1/2" v-if="canUpload" />
        <my-collections-component class="xl:w-1/2" v-if="canUpload" />
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
