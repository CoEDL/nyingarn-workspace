<template>
    <div class="flex flex-col">
        <!-- <div class="flex flex-row">
            <pre class="w-1/2 h-96 overflow-scroll">{{ data.crate }}</pre>
            <pre class="w-1/2 h-96 overflow-scroll">{{ props.profile }}</pre>
        </div> -->
        <!-- <render-entity-component
            v-if="data.currentEntity.describoId && !isEmpty(data.crate) && !isEmpty(data.profile)"
            class="my-4 p-2 bg-red-200"
            :crate="data.crate"
            :profile="data.profile"
            :entity="data.currentEntity"
            @save:property="saveProperty"
        /> -->
    </div>
</template>

<script setup>
import RenderEntityComponent from "./RenderEntity/Shell.component.vue";
import { onMounted, reactive, watch } from "vue";
import { cloneDeep, isEmpty, debounce } from "lodash";
import { v4 as uuid } from "uuid";
import { CrateManager } from "./helper-methods";

const props = defineProps({
    rocrateFile: {
        type: Object,
        required: true,
    },
    profile: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits([
    "update:crate",
    "update:entity",
    "update:property",
    "save:template",
    "add:files",
]);

const data = reactive({
    crate: [],
    profile: {},
    currentEntity: {},
    debouncedUpdate: debounce(update, 400),
    crateManager: undefined,
});

watch([() => props.rocrateFile, () => props.profile], () => {
    data.debouncedUpdate();
});
onMounted(() => {
    data.debouncedUpdate();
});

function update() {
    if (isEmpty(props.rocrateFile) || isEmpty(props.profile)) return;
    data.profile = cloneDeep(props.profile);
    data.crate = cloneDeep(props.rocrateFile);

    data.crateManager = new CrateManager({ crate: data.crate });
    data.crateManager.init();
    if (!data.currentEntity.describoId) {
        setCurrentEntity({ name: "RootDataset" });
    }
}
function setCurrentEntity({ describoId = undefined, name = undefined, id = undefined }) {
    let entity = {};
    if (name === "RootDataset") {
        entity = data.crateManager.getRootDataset();
    } else if (describoId) {
        entity = data.crateManagerdata.getEntity({ describoId });
    } else if (id) {
        entity = data.crateManagerdata.getEntity({ id });
    }
    data.currentEntity = { ...entity };
}
</script>
