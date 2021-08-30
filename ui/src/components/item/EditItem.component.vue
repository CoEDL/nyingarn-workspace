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
import { ref } from "vue";
import UploaderComponent from "@/components/Uploader.component.vue";
import ItemResources from "./ItemResources.component.vue";

export default {
    components: {
        UploaderComponent,
        ItemResources,
    },
    setup(props) {
        let activeTab = ref("metadata");
        const route = useRoute();
        const identifier = route.params.identifier;
        return {
            activeTab,
            identifier,
        };
    },
};
</script>
