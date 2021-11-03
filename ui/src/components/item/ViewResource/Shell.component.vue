<template>
    <div class="flex flex-row">
        <display-image-component class="w-1/2 lg:w-1/6" :data="data" v-if="data.length" />
    </div>
</template>

<script>
import { getResourceObjects } from "@/components/item/load-item-data";
import DisplayImageComponent from "./DisplayImage.component.vue";
export default {
    components: {
        DisplayImageComponent,
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            resource: this.$route.params.resource,
            data: [],
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            this.data = (
                await getResourceObjects({
                    identifier: this.identifier,
                    resource: this.resource,
                })
            ).objects;
        },
    },
};
</script>
