<template>
    <div class="flex flex-col space-y-2">
        <div class="bg-yellow-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-red-600">
                <i class="fas fa-exclamation-circle"></i>
            </div>
            <div class="text-base py-2">
                <ol class="pl-2 list-decimal">
                    <li>Upload the FromThePage TEI XML</li>
                    <li>Upload the image files</li>
                    <li>Ensure the image filenames match the names in the CSV file</li>
                </ol>
            </div>
        </div>
        <div class="bg-indigo-100 p-2 rounded flex flex-row">
            <div class="text-3xl p-4 text-gray-600">
                <i class="far fa-lightbulb"></i>
            </div>
            <div class="text-base py-2">
                Ensure you are uploading the TEI XML output from FromThePage and that the file is
                named '{{ identifier }}-ftp.xml'
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
