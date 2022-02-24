<template>
    <div>
        <iframe :src="url" class="h-full" :style="frameStyle" />
    </div>
</template>

<script>
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
                    height: `${window.innerHeight - 160}px`,
                };
            } else {
                return {
                    width: `${this.windowWidth * (5 / 6) - 40}px`,
                    height: `${window.innerHeight - 160}px`,
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
            let response = await this.$http.post({
                route: "/describo",
                body: { folder: this.$route.params.identifier },
            });
            this.url = (await response.json()).url;
        },
    },
};
</script>
