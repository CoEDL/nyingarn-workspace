<template>
    <div class="flex flex-col justify-around p-2 border border-solid relative">
        <div
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
        <!-- <img :src="props.src" class="image" /> -->
        <div id="image" :data-zoomist-src="data.src" class="image"></div>
    </div>
</template>

<script setup>
import { ElButton } from "element-plus";

import Zoomist from "zoomist";
import { reactive, onMounted, inject, watch } from "vue";
import { useRoute } from "vue-router";

const props = defineProps({
    src: {
        required: true,
    },
});
const data = reactive({
    src: "",
    zoomist: undefined,
});

watch(
    () => props.src,
    async (n) => {
        if (!props.src) return;
        data.src = props.src;
        await new Promise((resolve) => setTimeout(resolve, 10));
        if (!data.zoomist) {
            displayImage();
        } else {
            update();
        }
    }
);

async function displayImage() {
    data.zoomist = new Zoomist("#image", {
        fill: "contain",
        maxRatio: 10,
        slider: true,
        zoomer: true,
        height: "800px",
    });
}
function update() {
    data.zoomist.update();
}
</script>

<style>
.image {
    width: 500px;
    height: 780px;
}
</style>
