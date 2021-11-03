<template>
    <div>
        <el-image :src="src">
            <template #error
                ><div class="h-64 w-40 bg-gray-100 text-sm p-2 text-center">
                    thumbnail not yet available
                </div></template
            >
        </el-image>
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    props: {
        data: {
            type: Array,
        },
    },
    data() {
        return {
            src: undefined,
        };
    },
    mounted() {
        this.getImageThumbnailUrl();
    },
    methods: {
        async getImageThumbnailUrl() {
            let image = this.data.filter((image) => image.match("-ADMIN_thumbnail"));
            let response = await httpService.get({
                route: `/items/${this.$route.params.identifier}/resources/${image}/link`,
            });
            if (response.status !== 200) {
                // can't get link right now
            }
            let link = (await response.json()).link;
            this.src = link;
        },
    },
};
</script>
