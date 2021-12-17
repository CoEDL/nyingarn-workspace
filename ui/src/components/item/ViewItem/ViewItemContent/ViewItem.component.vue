<template>
    <div class="flex flex-row space-x-2 border border-gray-400 p-4">
        <display-image-thumbnail-component :data="data" />
        <div class="flex flex-col">
            <div class="text-center my-4 text-lg">{{ resource }}</div>
            <display-status-property-component property="Thumbnail" :value="completed.thumbnail" />
            <display-status-property-component
                property="Webformats"
                :value="completed.webformats"
            />
            <display-status-property-component property="OCR" :value="completed.tesseract" />
            <display-status-property-component property="TEI" :value="completed.tei" />
        </div>
    </div>
</template>

<script>
import DisplayImageThumbnailComponent from "./DisplayImageThumbnail.component.vue";
import DisplayStatusPropertyComponent from "./DisplayStatusProperty.component.vue";
export default {
    components: {
        DisplayImageThumbnailComponent,
        DisplayStatusPropertyComponent,
    },
    props: {
        resource: {
            type: String,
            required: true,
        },
        data: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            completed: {},
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            let response = await this.$http.get({
                route: `/items/${this.identifier}/resources/${this.resource}/status`,
            });
            if (response.status === 200) {
                this.completed = (await response.json()).completed;
            }
        },
    },
};
</script>
