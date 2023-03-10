<template>
    <div class="flex flex-col space-y-2">
        <InfoBoxComponent :msg="message"> </InfoBoxComponent>
    </div>
</template>

<script setup>
import InfoBoxComponent from "../../../InfoBox.component.vue";
const props = defineProps({
    identifier: {
        type: String,
        required: true,
    },
});

const message = `
Upload a transcription.
<br/>
<ul class="ml-2 list-disc">
    <li>If you have a Digivol transcription, name the file '${props.identifier}-digivol.csv'</li>
    <li>If you have a TEI file or Word document converted to TEI, name the file '${props.identifier}-tei.xml'</li>
</ul>
`;
</script>
