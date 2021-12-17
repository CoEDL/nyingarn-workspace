<template>
    <div class="flex flex-col">
        <div>
            <el-button @click="init"><i class="fas fa-sync-alt"></i>&nbsp;refresh</el-button>
        </div>

        <div class="flex flex-row flex-wrap">
            <view-item-component
                class="cursor-pointer m-2"
                @click="viewResource(resource)"
                v-for="(item, resource, idx) in resources"
                :key="idx"
                :resource="resource"
                :data="item"
            />
        </div>
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
            this.resources = (
                await getItemResources({ $http: this.$http, identifier: this.identifier })
            ).resources;
        },
        viewResource(resource) {
            this.$router.push(`/resource/${this.identifier}/${resource}`);
        },
    },
};
</script>

l
