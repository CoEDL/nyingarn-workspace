<template>
    <div class="flex flex-col justify-around p-2">
        <img ref="image" :srcset="srcset" :src="src" :style="maxHeight" />
    </div>
</template>

<script>
import ImageViewer from "iv-viewer";
import "iv-viewer/dist/iv-viewer.css";

export default {
    props: {
        data: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            imageFormats: "jpe?g|webp|avif|png",
            srcset: [],
            src: undefined,
        };
    },
    computed: {
        maxHeight: function () {
            return { height: `${window.innerHeight - 150}px` };
        },
    },
    mounted() {
        this.getImageUrls();
    },
    methods: {
        async getImageUrls() {
            let images = this.data
                .filter((image) => !image.match("thumbnail"))
                .filter((image) => {
                    const re = new RegExp(this.imageFormats, "i");
                    return re.exec(image);
                });
            for (let image of images) {
                let response = await this.$http.get({
                    route: `/items/${this.identifier}/resources/${image}/link`,
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
            const viewer = new ImageViewer(this.$refs.image, {});
        },
    },
};
</script>
