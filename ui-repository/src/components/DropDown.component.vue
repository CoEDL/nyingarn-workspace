<template>
    <div class="static">
        <el-button @click="data.showDropDown = !data.showDropDown" class="mt-1">{{
            props.controlName
        }}</el-button>
        <div
            class="bg-white p-4 rounded absolute z-10"
            :class="props.class"
            :style="props.style"
            v-if="data.showDropDown"
        >
            <slot name="content"> </slot>
        </div>
    </div>
</template>

<script setup>
import { reactive } from "vue";

const props = defineProps({
    controlName: { type: String, required: true },
    class: { type: String },
    style: {},
});
const data = reactive({
    showDropDown: false,
});
</script>
