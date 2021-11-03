<template>
    <div><img :srcset="srcset" :src="src" /></div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    props: {
        data: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            imageFormats: "jpe?g|webp|avif|png",
            srcset: [],
            src: undefined,
        };
    },
    mounted() {
        this.getImageUrls();
    },
    methods: {
        async getImageUrls() {
            let images = this.data
                .filter((image) => !image.match("-ADMIN_thumbnail"))
                .filter((image) => {
                    const re = new RegExp(this.imageFormats, "i");
                    return re.exec(image);
                });
            for (let image of images) {
                let response = await httpService.get({
                    route: `/items/${this.$route.params.identifier}/resources/${image}/link`,
                });
                if (response.status !== 200) {
                    // can't get link right now
                }
                let link = (await response.json()).link;
                if (image.match(/jpe?g/i)) {
                    this.src = link;
                } else {
                    this.srcset.push(link);
                }
            }
        },
    },
};
</script>
