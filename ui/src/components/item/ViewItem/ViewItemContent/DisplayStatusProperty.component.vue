<template>
    <div class="flex flex-row text-sm">
        <div>{{ property }}:</div>
        <div class="flex flex-grow" />
        <div v-show="value" class="text-green-600 w-10 text-center">
            <i class="fas fa-check"></i>
        </div>
        <div v-show="!value" class="text-red-600 w-10 text-center">
            <i class="fas fa-times"></i>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        property: { type: String, required: true },
        value: { type: Boolean, required: true },
    },
    data() {
        return {};
    },
};
</script>
