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
        };
    },
    computed: {
        frameStyle() {
            if (window.innerWidth <= 1100) {
                return { width: `${window.innerWidth * (4 / 6) - 60}px` };
            } else {
                return { width: `${window.innerWidth * (5 / 6) - 40}px` };
            }
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
