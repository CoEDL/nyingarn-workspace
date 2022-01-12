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
            <div
                class="grid grid-flow-col auto-cols-max gap-4 place-content-center text-lg text-center"
            >
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('digivol')"
                >
                    Upload data from DigiVol
                </div>
                <div
                    class="border rounded p-10 break-normal hover:bg-indigo-100 hover:cursor-pointer"
                    @click="showHelp('ftp')"
                >
                    Upload data from FromThePage
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
