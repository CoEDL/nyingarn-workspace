<template>
    <div class="flex flex-col space-y-2">
        <div class="bg-yellow-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-gray-600">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="text-base py-2">
                <ul class="pl-2 list-disc">
                    <li>Upload the image files</li>
                </ul>
            </div>
        </div>
        <div class="bg-indigo-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-gray-600">
                <i class="far fa-lightbulb"></i>
            </div>
            <div class="text-base py-2">
                When uploading images they will pass through Optical Character Recognition (OCR) to
                try to transcribe the text. This can take some time for each image.
            </div>
        </div>
        <div class="bg-indigo-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-gray-600">
                <i class="far fa-lightbulb"></i>
            </div>
            <div class="text-base py-2">
                File names must match the form {{ this.identifier }}-{sequence number} where
                sequence number can be any sequence of digits followed by letters (a-z,A-Z) or _.
                <div>Accepted images types: tiff and jpg.</div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            identifier: this.$route.params.identifier,
        };
    },
};
</script>
