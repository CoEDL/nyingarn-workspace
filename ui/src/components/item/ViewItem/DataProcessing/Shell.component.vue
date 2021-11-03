<template>
    <div><el-button @click="test">test</el-button></div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();
export default {
    data() {
        return {};
    },
    methods: {
        async test() {
            await httpService.get({
                route: `/process/${this.$route.params.identifier}/images`,
            });
        },
    },
};
</script>
