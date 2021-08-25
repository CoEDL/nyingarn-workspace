<template>
    <div class="flex flex-col px-4">
        <div class="text-xl my-4">Item: {{ identifier }}</div>
        <el-tabs v-model="activeTab">
            <el-tab-pane label="Metadata" name="metadata">
                Not yet implemented but there will probably be a link to Describo here and a
                rendering of the content of the crate file...
            </el-tab-pane>
            <el-tab-pane label="Content" name="content">
                <div class="my-4 text-gray-700">Upload data files to this item.</div>
                <uploader-component :identifier="identifier" v-if="activeTab === 'content'" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import { useRoute } from "vue-router";
import { ref } from "vue";
import UploaderComponent from "@/components/Uploader.component.vue";

export default {
    components: {
        UploaderComponent,
    },
    setup(props) {
        let activeTab = ref("content");
        const route = useRoute();
        const identifier = route.params.identifier;
        return {
            activeTab,
            identifier,
        };
    },
};
</script>
