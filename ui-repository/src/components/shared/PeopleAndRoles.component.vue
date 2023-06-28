<template>
    <div class="flex flex-col">
        <div v-for="role of Object.keys(data.roles)" :key="role">
            <div v-if="data.roles[role].length" class="flex flex-row space-x-2 flex-wrap">
                <div class="w-60">{{ role }}</div>
                <div>{{ data.roles[role].map((i) => i.name[0]).join(", ") }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive } from "vue";
import { ROCrate } from "ro-crate";

const props = defineProps({
    crate: {
        type: Object,
        required: true,
    },
});
const data = reactive({
    people: {},
    roles: {
        annotator: [],
        author: [],
        compiler: [],
        consultant: [],
        data_inputter: [],
        depositor: [],
        developer: [],
        editor: [],
        illustrator: [],
        interpreter: [],
        interviewer: [],
        participant: [],
        performer: [],
        photographer: [],
        recorder: [],
        register: [],
        researcher: [],
        research_participant: [],
        responder: [],
        signer: [],
        singer: [],
        speaker: [],
        sponsor: [],
        transcriber: [],
        translator: [],
    },
});

extractPeopleAndRoles();
function extractPeopleAndRoles() {
    const crate = new ROCrate(props.crate, { array: true, link: true });

    for (let role of Object.keys(data.roles)) {
        if ([role] in crate.rootDataset) {
            let entities = crate.rootDataset[role].map((e) => crate.getEntity(e["@id"]));
            data.roles[role] = [...entities];
        }
    }
}
</script>
