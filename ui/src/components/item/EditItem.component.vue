<template>
    <div class="flex flex-col px-4">
        <div class="text-xl my-4">Item: {{ identifier }}</div>
        <el-tabs v-model="activeTab">
            <el-tab-pane label="Metadata" name="metadata">
                Not yet implemented but there will probably be a link to Describo here and a
                rendering of the content of the crate file...
            </el-tab-pane>
            <el-tab-pane label="Content" name="content">
                <div class="my-2 flex flex-col space-y-2" v-if="activeTab === 'content'">
                    <div class="bg-yellow-200 p-2 rounded flex flex-row">
                        <div class="text-4xl p-4 text-gray-600">
                            <i class="far fa-lightbulb"></i>
                        </div>
                        <ul class="text-gray-600 list-disc pl-10">
                            <li>{{ helpFilenameStructure }}</li>
                            <li>{{ helpFileExtension }}</li>
                        </ul>
                    </div>
                    <div class="flex flex-row">
                        <uploader-component
                            class="w-1/2"
                            :identifier="identifier"
                            v-if="activeTab === 'content'"
                        />
                        <item-resources
                            class="w-1/2 px-2"
                            :identifier="identifier"
                            v-if="activeTab === 'content'"
                        />
                    </div>
                </div>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { ref } from "vue";
import UploaderComponent from "@/components/Uploader.component.vue";
import ItemResources from "./ItemResources.component.vue";

export default {
    components: {
        UploaderComponent,
        ItemResources,
    },
    setup(props) {
        const store = useStore();
        const helpFilenameStructure = store.state.configuration.ui?.filename?.helpName;
        const helpFileExtension = store.state.configuration.ui?.filename?.helpExtension;
        let activeTab = ref("content");
        const route = useRoute();
        const identifier = route.params.identifier;
        return {
            helpFilenameStructure,
            helpFileExtension,
            activeTab,
            identifier,
        };
    },
};
</script>
