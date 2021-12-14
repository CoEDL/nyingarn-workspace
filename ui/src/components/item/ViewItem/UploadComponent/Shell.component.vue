<template>
    <div class="my-2 flex flex-col space-y-2">
        <div class="bg-yellow-200 p-2 rounded flex flex-row">
            <div class="text-4xl p-4 text-gray-600">
                <i class="far fa-lightbulb"></i>
            </div>
            <ul class="text-gray-600 list-disc pl-10">
                <li>
                    Item names must match the form {{ this.identifier }}-{sequence number} where
                    sequence number can be any sequence of digits followed by letters (a-z,A-Z) or _
                </li>
                <li>{{ helpFileExtension }}</li>
            </ul>
        </div>
        <div class="flex flex-row">
            <uploader-component class="w-full" :identifier="identifier" />
        </div>
    </div>
</template>

<script>
import UploaderComponent from "./Uploader.component.vue";

export default {
    components: {
        UploaderComponent,
    },
    data() {
        return {
            helpFileExtension: this.$store.state.configuration.ui?.filename?.helpExtension,
            identifier: this.$route.params.identifier,
        };
    },
};
</script>
