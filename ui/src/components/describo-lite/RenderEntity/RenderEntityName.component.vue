<template>
    <div class="flex flex-row">
        <div class="w-64 pt-1">name</div>

        <div class="flex-grow">
            <text-component
                class="w-full"
                type="text"
                :property="data.property"
                :value.sync="entity.name"
                @save:property="save"
            />
        </div>
    </div>
</template>

<script setup>
import TextComponent from "../base-components/Text.component.vue";
import { reactive, watch } from "vue";

let props = defineProps({
    entity: {
        type: Object,
        required: true,
    },
});
const emit = defineEmits(["save:property"]);

let data = reactive({
    property: "name",
    value: props.entity.value,
});
watch(
    () => props.entity.value,
    () => {
        data.value = props.entity.value;
    }
);

async function save(data) {
    emit("save:property", {
        property: data.property,
        value: data.value,
    });
}
</script>
