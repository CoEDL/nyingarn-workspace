<template>
    <div class="flex flex-col justify-around p-2 border border-solid relative">
        <div
            v-if="src"
            class="absolute cursor-pointer"
            style="
                top: 100px;
                width: 50px;
                height: 50px;
                right: 8px;
                z-index: 10;
                background-color: rgba(255, 255, 255, 0.9);
            "
            @click="reset"
        >
            <span
                class="text-gray-500"
                style="
                    position: absolute;
                    top: 55%;
                    left: 43%;
                    transform: translate(-50%, -50%);
                    width: 12px;
                "
            >
                <i class="fas fa-sync"></i>
            </span>
        </div>
        <div id="image" :data-zoomist-src="src" :style="maxHeight" v-if="src" />
    </div>
</template>

<script>
import Zoomist from "zoomist";

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
            zoomist: undefined,
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
            if (this.src) {
                this.zoomist = new Zoomist("#image", {
                    fill: "contain",
                    maxRatio: 10,
                    slider: true,
                    zoomer: true,
                    height: window.innerHeight - 150,
                });
            }
        },
        reset() {
            this.zoomist.reset();
        },
    },
};
</script>
