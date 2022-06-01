<template>
    <div class="flex flex-row space-y-1">
        <div class="w-64 pt-1">Identifier</div>

        <div v-if="['Dataset', 'File'].includes(entity['@type'])" class="">
            {{ entity["@id"] }}
        </div>
        <div v-else>
            <text-component
                class="w-full"
                type="text"
                property="@id"
                :value.sync="entity.name"
                @save:property="save"
            />
        </div>
    </div>
</template>

<script setup>
import TextComponent from "../base-components/Text.component.vue";
import { reactive, watch } from "vue";
import { debounce } from "lodash";

const props = defineProps({
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
    () => props.entity["@id"],
    () => {
        data.value = props.entity["@id"];
    }
);

async function save(data) {
    emit("save:property", {
        property: "@id",
        value: data.value,
    });
}
</script>
