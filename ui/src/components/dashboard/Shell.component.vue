<template>
    <div class="">
	<div class="flex flex-col p-4 space-y-4" v-if="canUpload">
	    <my-collections-component />
            <my-items-component />
        </div>
        <div v-else><terms-and-conditions-component /></div>
    </div>
</template>

<script>
import MyItemsComponent from "@/components/item/MyItems.component.vue";
import MyCollectionsComponent from "@/components/collection/MyCollections.component.vue";
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
