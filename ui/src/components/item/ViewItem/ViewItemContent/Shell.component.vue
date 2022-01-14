<template>
    <div class="flex flex-row flex-wrap overflow-scroll" :style="{ height: panelHeight }">
        <view-item-component
            class="cursor-pointer m-2 h-80"
            v-for="(item, resource, idx) in resources"
            :key="idx"
            :resource="resource"
            :data="item"
            @refresh-item="init"
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
            panelHeight: `${window.innerHeight - 180}px`,
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            this.resources = (
                await getItemResources({ $http: this.$http, identifier: this.identifier })
            ).resources;
        },
    },
};
</script>

l
