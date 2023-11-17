<template>
    <div class="flex flex-col space-y-4 text-lg text-slate-700 rounded p-6">
        <div class="text-2xl">
            {{ crate.rootDataset?.name?.[0] }}
        </div>
        <div class="flex flex-col md:flex-row space-x-2">
            <div class="w-1/5">Identifier:</div>
            <div class="w-4/5">
                {{ crate.rootDataset?.identifier?.[0] }}
            </div>
        </div>
        <div class="flex flex-col md:flex-row space-x-2">
            <div class="w-1/5">Description:</div>
            <div
                class="w-4/5 flex flex-col space-y-2"
                v-for="(d, idx) of crate.rootDataset?.description"
                :idx="idx"
            >
                <div>{{ d }}</div>
            </div>
        </div>
        <div class="flex flex-col md:flex-row space-x-2">
            <div class="w-1/5">Licence:</div>
            <div class="w-4/5">
                {{ crate.rootDataset?.licence?.[0]?.name?.[0] }}
                <span v-if="crate.rootDataset?.licence?.[0]?.description?.[0]">
                    : {{ crate.rootDataset?.licence?.[0]?.description?.[0] }}
                </span>
            </div>
        </div>

        <div class="flex flex-col space-y-2 md:flex-row space-x-2">
            <div class="w-1/5">Languages:</div>
            <div class="flex flex-col space-y-4 w-4/5">
                <div v-for="language of languages">
                    <div>
                        {{ language?.name?.[0] }}
                    </div>
                    <!-- <MapComponent class="flex-grow" :entity="language" v-if="language.geo" /> -->
                    <div class="text-sm">
                        Also known as:
                        {{ language?.alternateName?.join(", ") }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { ROCrate } from "ro-crate";

const props = defineProps({
    crate: {
        type: Object,
        required: true,
    },
});
let crate = computed(() => {
    return new ROCrate(props.crate, { array: true, link: true });
});

let languages = computed(() => {
    let crate = new ROCrate(props.crate, { array: true, link: true });
    let languages = [];
    for (let e of crate.entities()) {
        if (e["@type"].includes("Language")) {
            const geo = crate.getEntity(e?.geo?.["@id"]);
            languages.push({
                ...e,
                geo,
            });
        }
    }
    return languages;
});
</script>
