<template>
    <div class="resize_container">
        <div class="resize_container__left">
            <display-image-component
                class="w-full"
                :refresh="data.refresh"
                :data="data.files"
                @updated="data.refresh = false"
                v-if="data.files.length"
            />
        </div>
        <div class="resizer" id="resizer"></div>
        <div class="resize_container__right">
            <transcription-editor
                class="w-full h-full"
                :data="data.files"
                v-if="data.files.length"
            />
        </div>
    </div>
</template>

<script setup>
import DisplayImageComponent from "./DisplayImage.component.vue";
import TranscriptionEditor from "./TranscriptionEditor.component.vue";
import { reactive, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    files: [],
    resizer: undefined,
    leftSide: undefined,
    rightSide: undefined,
    x: 0,
    y: 0,
    leftWidth: 0,
    refresh: false,
});
onMounted(() => {});

let resizer, leftSide, rightSide;
onMounted(async () => {
    await init();
    resizer = document.getElementById("resizer");
    leftSide = resizer.previousElementSibling;
    rightSide = resizer.nextElementSibling;

    // The current position of mouse
    data.x = 0;
    data.y = 0;
    data.leftWidth = 0;

    // Attach the handler
    try {
        resizer.addEventListener("mousedown", mouseDownHandler);
    } catch (error) {
        console.log(error);
    }
});

async function init() {
    let response = await $http.get({
        route: `/items/${$route.params.identifier}/resources/${$route.params.resource}/files`,
    });
    if (response.status === 200) {
        data.files = (await response.json()).files;
    }
}

function mouseDownHandler(e) {
    // Get the current mouse position
    data.x = e.clientX;
    data.y = e.clientY;
    data.leftWidth = leftSide.getBoundingClientRect().width;
    // Attach the listeners to `document`
    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
}

function mouseMoveHandler(e) {
    // How far the mouse has been moved
    const dx = e.clientX - data.x;
    const dy = e.clientY - data.y;

    const newLeftWidth =
        ((data.leftWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;
    leftSide.style.width = `${newLeftWidth}%`;

    resizer.style.cursor = "col-resize";
    document.body.style.cursor = "col-resize";

    leftSide.style.userSelect = "none";
    leftSide.style.pointerEvents = "none";

    rightSide.style.userSelect = "none";
    rightSide.style.pointerEvents = "none";
}

function mouseUpHandler() {
    resizer.style.removeProperty("cursor");
    document.body.style.removeProperty("cursor");

    leftSide.style.removeProperty("user-select");
    leftSide.style.removeProperty("pointer-events");

    rightSide.style.removeProperty("user-select");
    rightSide.style.removeProperty("pointer-events");

    // Remove the handlers of `mousemove` and `mouseup`
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);

    data.refresh = true;
}
</script>

<style scoped>
.resize_container {
    display: flex;
    flex-direction: row;

    /* Misc */
    height: calc(100vh - 150px);
}
.resize_container__left {
    /* Initially, the left takes 3/4 width */
    width: 35%;

    /* Misc */
    align-items: center;
    display: flex;
    justify-content: center;
}
.resizer {
    background-color: #cbd5e0;
    cursor: ew-resize;
    height: 100%;
    width: 10px;
}
.resize_container__right {
    /* Take the remaining width */
    flex: 1;

    /* Misc */
    align-items: center;
    display: flex;
    justify-content: center;
}
</style>
