<template>
    <div class="flex flex-row space-x-2 flex-wrap">
        <view-item-component
            class="cursor-pointer"
            @click="viewResource(resource)"
            v-for="(item, resource, idx) in resources"
            :key="idx"
            :resource="resource"
            :data="item"
        />
    </div>
</template>

<script>
import { getItemResources } from "@/components/item/load-item-data";
import ViewItemComponent from "./ViewItem.component.vue";

export default {
    components: {
        ViewItemComponent,
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            resources: [],
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            this.resources = (await getItemResources({ identifier: this.identifier })).resources;
        },
        viewResource(resource) {
            this.$router.push(`/resource/${this.identifier}/${resource}`);
        },
    },
};
</script>

l
