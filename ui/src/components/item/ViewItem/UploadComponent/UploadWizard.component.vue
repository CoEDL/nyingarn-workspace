<template>
    <div>
        <el-dialog
            v-model="dialogVisible"
            title=""
            :show-close="false"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            width="90%"
        >
            <div class="flex justify-center grid grid-cols-3 gap-4 text-lg text-center">
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('digivol')"
                >
                    Upload transcriptions from DigiVol
                </div>
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('ftp')"
                >
                    Upload transcriptions from FromThePage
                </div>
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('tei')"
                >
                    Upload TEI transcriptions
                </div>
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('word')"
                >
                    Upload Word / PDF transcriptions converted to TEI via OxGarage
                </div>
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('images')"
                >
                    Upload images only
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script>
export default {
    data() {
        return {
            dialogVisible: true,
        };
    },
    methods: {
        showHelp(type) {
            this.$emit("show-help", { type });
            this.dialogVisible = false;
        },
    },
};
</script>
