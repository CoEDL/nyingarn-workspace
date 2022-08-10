<template>
    <div class="flex flex-col">
        <div class="flex flex-row text-xl mb-2 bg-indigo-200 p-4 space-x-4 text-gray-700">
            <div>
                <i class="fa-solid fa-file-image"></i>
            </div>
            <router-link :to="itemUrl">{{ identifier }} /</router-link>
            <div class="text-lg">{{ resource }}</div>
            <div class="flex-grow"></div>
            <div>
                <el-button
                    size="small"
                    text
                    @click="loadItem(pageControls.previous)"
                    :disabled="!pageControls.previous"
                >
                    <i class="fa-solid fa-arrow-left"></i>
                </el-button>
            </div>
            <div class="pt-1 text-sm text-gray-700">
                Page {{ pageControls.page }} of {{ pageControls.total }}
            </div>
            <div>
                <el-button
                    size="small"
                    text
                    @click="loadItem(pageControls.next)"
                    :disabled="!pageControls.next"
                >
                    <i class="fa-solid fa-arrow-right"></i>
                </el-button>
            </div>
        </div>
        <div class="px-5" v-if="ready">
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
import { getItemResources } from "@/components/item/item-services";

export default {
    components: {
        TranscriptionComponent,
        FilesComponent,
    },
    data() {
        return {
            ready: false,
            identifier: this.$route.params.identifier,
            resource: this.$route.params.resource,
            routeWatcher: undefined,
            tabs: ["transcription", "files"],
            activeTab: "transcription",
            pageControls: {},
        };
    },
    computed: {
        itemUrl: function () {
            return `/items/${this.identifier}/view`;
        },
    },
    watch: {
        "$route.path": function () {
            (this.resource = this.$route.params.resource), this.getItemResources();
        },
    },
    mounted() {
        this.getItemResources();
    },
    methods: {
        async getItemResources() {
            this.ready = false;
            let response = await getItemResources({
                $http: this.$http,
                identifier: this.identifier,
            });
            if (response.status === 200) {
                let { resources, total } = await response.json();
                let resource = resources.filter((r) => r.name === this.resource)[0];
                this.pageControls = { ...resource };
            }
            this.ready = true;
        },
        async loadItem(resource) {
            this.$router.push(`/resource/${this.identifier}/${resource}`);
        },
    },
};
</script>
