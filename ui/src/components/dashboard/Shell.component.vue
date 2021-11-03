<template>
    <div class="">
        <div class="flex flex-col" v-if="canUpload">
            <my-items-component />
        </div>
        <div v-else><terms-and-conditions-component /></div>
    </div>
</template>

<script>
import MyItemsComponent from "@/components/item/MyItems.component.vue";
import TermsAndConditionsComponent from "./TermsAndConditions.component.vue";
export default {
    components: {
        MyItemsComponent,
        TermsAndConditionsComponent,
    },
    computed: {
        canUpload() {
            return this.$store.state.user.upload;
        },
    },
};
</script>
