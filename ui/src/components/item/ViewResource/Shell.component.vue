<template>
    <div class="flex flex-col">
        <div class="text-xl mb-2 bg-indigo-200 p-4 flex flex-row space-x-4">
            <router-link link :to="itemUrl">{{ identifier }}:</router-link>
            <div class="text-lg">{{ resource }}</div>
        </div>
        <div class="px-2">
            <el-tabs v-model="activeTab">
                <el-tab-pane label="Edit Transcription" name="transcription">
                    <transcription-component v-if="activeTab === 'transcription'" />
                </el-tab-pane>
                <el-tab-pane label="Files" name="files">
                    <files-component v-if="activeTab === 'files'" />
                </el-tab-pane>
            </el-tabs>
        </div>
    </div>
</template>

<script>
import TranscriptionComponent from "./TranscriptionComponent/Shell.component.vue";
import FilesComponent from "./Files.component.vue";
export default {
    components: {
        TranscriptionComponent,
        FilesComponent,
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            resource: this.$route.params.resource,
            routeWatcher: undefined,
            tabs: ["transcription", "files"],
            activeTab: "transcription",
        };
    },
    computed: {
        itemUrl: function () {
            return `/items/${this.identifier}/view`;
        },
    },
};
</script>
