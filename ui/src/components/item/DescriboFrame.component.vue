<template>
    <div>
        <iframe :src="url" class="w-full h-full" />
        <el-button @click="init">init</el-button>
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
