<template>
    <div
        class="bg-yellow-100 rounded flex flex-row items-center"
        :class="{ 'justify-center': props.textAlign === 'center' }"
    >
        <div class="text-4xl p-6 text-red-600">
            <i class="fa-solid fa-exclamation-circle"></i>
        </div>
        <div class="text-base p-2" v-html="msg"></div>
    </div>
</template>

<script setup>
const props = defineProps({
    textAlign: {
        type: String,
        default: "left",
    },
    msg: {
        type: String,
        required: true,
    },
});
</script>
