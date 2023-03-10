<template>
    <div class="flex flex-col space-y-2">
        <InfoBoxComponent
            msg=" When uploading images they will pass through Optical Character Recognition (OCR) to
                try to transcribe the text. This can take some time for each image. You can disable
                this using the toggle below."
        ></InfoBoxComponent>
        <InfoBoxComponent :identifier="props.identifier" :msg="message"> </InfoBoxComponent>
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

const message = `File names must match the form ${props.identifier}-{sequence number} where
                sequence number can be any sequence of digits followed by letters (a-z,A-Z) or _.
                <br/>
                <br/>
                <div>Accepted images types: tiff and jpg.</div>`;
</script>
