<template>
    <div class="flex flex-col justify-around p-2 border border-solid relative">
        <div
            v-if="data.src"
            class="absolute cursor-pointer"
            style="
                top: 100px;
                width: 50px;
                height: 50px;
                right: 8px;
                z-index: 10;
                background-color: rgba(255, 255, 255, 0.9);
            "
            @click="update"
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
                <i class="fa-solid fa-sync"></i>
            </span>
        </div>
        <div id="image" :data-zoomist-src="data.src" :style="maxHeight" v-if="data.src" />
    </div>
</template>

<script setup>
import Zoomist from "zoomist";
import { reactive, computed, onMounted, inject, watch } from "vue";
import { useRoute } from "vue-router";
import { debounce } from "lodash";
const $route = useRoute();
const $http = inject("$http");

const props = defineProps({
    data: {
        type: Array,
        required: true,
    },
    refresh: {
        type: Boolean,
    },
});
const emit = defineEmits(["updated"]);
const data = reactive({
    identifier: $route.params.identifier,
    imageFormats: "jpe?g|webp|avif|png",
    srcset: [],
    src: undefined,
    zoomist: undefined,
    debouncedUpdate: debounce(update, 500),
});
let maxHeight = computed(() => {
    return { height: `${window.innerHeight - 150}px` };
});

watch(
    () => props.refresh,
    (n) => {
        if (n) data.debouncedUpdate();
    }
);

onMounted(() => {
    getImageUrls();
});

async function getImageUrls() {
    let images = props.data
        .filter((image) => !image.match("thumbnail"))
        .filter((image) => !image.match("xml"))
        .filter((image) => {
            const re = new RegExp(data.imageFormats, "i");
            return re.exec(image);
        });
    for (let image of images) {
        let response = await $http.get({
            route: `/items/${data.identifier}/resources/${image}/link`,
        });
        if (response.status !== 200) {
            // can't get link right now
        }
        let link = (await response.json()).link;
        if (image.match(/jpe?g/i)) {
            data.src = link;
        } else {
            data.srcset.push(link);
        }
    }
    if (data.src) {
        try {
            data.zoomist = new Zoomist("#image", {
                fill: "contain",
                maxRatio: 10,
                slider: true,
                zoomer: true,
                height: window.innerHeight - 150,
            });
        } catch (error) {
            // swallow errors - likely the user     navigated away from resource
            //  whilst this was still initialising
        }
    }
}
function update() {
    data.zoomist.update();
    emit("updated");
}
</script>
