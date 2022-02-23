<template>
    <div class="flex flex-row">
        <display-image-component class="w-1/2" :data="data" v-if="data.length" />
        <display-transcription-component class="w-1/2" :data="data" v-if="data.length" />
    </div>
</template>

<script>
import DisplayImageComponent from "./DisplayImage.component.vue";
import DisplayTranscriptionComponent from "./DisplayTranscription.component.vue";
export default {
    components: {
        DisplayImageComponent,
        DisplayTranscriptionComponent,
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
            let response = await this.$http.get({
                route: `/items/${this.identifier}/resources/${this.resource}/files`,
            });
            if (response.status === 200) {
                this.data = (await response.json()).files;
            }
        },
    },
};
</script>
