<template>
    <div>
        <iframe :src="url" class="h-full" :style="frameStyle" />
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    data() {
        return {
            url: undefined,
            frameStyle: undefined,
        };
    },
    computed: {
        frameStyle() {
            return { width: "1000px" };
        },
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            let response = await httpService.post({
                route: "/describo",
                body: { folder: this.$route.params.identifier },
            });
            this.url = (await response.json()).url;
        },
    },
};
</script>
