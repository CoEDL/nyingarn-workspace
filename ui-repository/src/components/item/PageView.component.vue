<template>
    <div class="resize_container" v-show="data.src">
        <div class="resize_container__left">
            <display-image-component class="w-full" :src="data.src" />
        </div>
        <div class="resizer" id="resizer"></div>
        <div class="resize_container__right">
            <preview-component :document="data.document" />
        </div>
    </div>
    <div v-if="data.message?.code === 'Access Denied'" class="text-center">
        {{ data.message.code }}: {{ data.message.reason }}
    </div>
</template>

<script setup>
import DisplayImageComponent from "./DisplayImage.component.vue";
import PreviewComponent from "./Preview.component.vue";
import { reactive, onMounted, inject, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const props = defineProps({
    resource: {
        required: true,
    },
});

const data = reactive({
    src: undefined,
    document: undefined,
    resizer: undefined,
    leftSide: undefined,
    rightSide: undefined,
    x: 0,
    y: 0,
    leftWidth: 0,
    refresh: false,
    message: undefined,
});

watch(
    () => props.resource,
    () => {
        loadResource();
    }
);

let resizer, leftSide, rightSide;
onMounted(async () => {
    await loadResource();
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

async function loadResource() {
    let response = await $http.get({
        route: `/repository/item/${$route.params.itemId}/${props.resource}`,
    });
    // data.loading = false;
    if (response.status !== 200) {
        data.error = true;
        return;
    }
    response = await response.json();
    data.src = response.imageUrl;
    data.document = response.document;
    data.message = response.message;
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
    height: 800px;
}
.resize_container__left {
    /* Initially, the left takes 3/4 width */
    width: 50%;
}
.resizer {
    background-color: #cbd5e0;
    cursor: ew-resize;
    height: 100%;
    width: 5px;
}
.resize_container__right {
    /* Take the remaining width */
    flex: 1;
}
</style>
