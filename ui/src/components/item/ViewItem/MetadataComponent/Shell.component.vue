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
            windowWidth: window.innerWidth,
        };
    },
    computed: {
        frameStyle: function () {
            if (this.windowWidth <= 1100) {
                return {
                    width: `${this.windowWidth * (4 / 6) - 60}px`,
                    height: `${window.innerHeight - 130}px`,
                };
            } else {
                return {
                    width: `${this.windowWidth * (5 / 6) - 40}px`,
                    height: `${window.innerHeight - 130}px`,
                };
            }
        },
    },
    mounted() {
        window.addEventListener("resize", () => {
            this.windowWidth = window.innerWidth;
        });
        this.init();
    },
    methods: {
        async init() {
            let response = await httpService.post({
                route: "/describo",
                body: { folder: this.$route.params.identifier },
            });
            console.log(this.url);
            this.url = (await response.json()).url;
        },
    },
};
</script>
