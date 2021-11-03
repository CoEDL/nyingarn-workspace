<template>
    <div class="flex flex-col">
        <display-image-thumbnail-component :data="data" />
        <div class="text-center">{{ resource }}</div>
    </div>
</template>

<script>
import DisplayImageThumbnailComponent from "./DisplayImageThumbnail.component.vue";
export default {
    components: {
        DisplayImageThumbnailComponent,
    },
    props: {
        resource: {
            type: String,
            required: true,
        },
        data: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {};
    },
};
</script>
