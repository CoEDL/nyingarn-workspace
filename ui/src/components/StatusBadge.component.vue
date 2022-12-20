<template>
    <div
        class="py-1 px-4 rounded text-center"
        :class="{
            'bg-blue-300': props.status === 'inProgress',
            'bg-orange-300': props.status === 'awaitingReview',
            'bg-green-200': props.status === 'published',
            'bg-red-500': props.status === 'needsWork',
        }"
    >
        {{ status }}
    </div>
</template>

<script setup>
import { computed } from "vue";
import { startCase } from "lodash";
const props = defineProps({
    status: { type: [String, undefined], required: true },
});
const status = computed(() => startCase(props.status));
</script>
