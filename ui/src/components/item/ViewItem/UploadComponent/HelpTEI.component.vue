<template>
    <div class="flex flex-col space-y-2">
        <div class="bg-yellow-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-red-600">
                <i class="fa-solid fa-exclamation-circle"></i>
            </div>
            <div class="text-base py-2">
                <ol class="pl-2 list-decimal">
                    <li v-if="type === 'ftp'">Upload the FromThePage TEI XML</li>
                    <li v-if="type === 'tei'">Upload TEI transcription XML</li>
                    <li v-if="type === 'word'">
                        Upload Word document transcriptions converted to TEI via OxGarage
                    </li>
                    <li>Ensure the image filenames match the names in the CSV file</li>
                    <li>Upload the image files</li>
                </ol>
            </div>
        </div>
        <div class="bg-indigo-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-gray-600">
                <i class="fa-solid fa-lightbulb"></i>
            </div>
            <div class="text-base py-2">
                Ensure you are uploading a TEI XML file named '{{ props.identifier }}-tei.xml'
            </div>
        </div>
        <div class="bg-indigo-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-gray-600">
                <i class="fa-solid fa-lightbulb"></i>
            </div>
            <div class="text-base py-2">
                File names must match the form {{ props.identifier }}-{sequence number} where
                sequence number can be any sequence of digits followed by letters (a-z,A-Z) or _.
                <div>Accepted images types: tiff and jpg.</div>
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    type: { type: String, default: "ftp" },
    identifier: { stype: String, required: true },
});
</script>
