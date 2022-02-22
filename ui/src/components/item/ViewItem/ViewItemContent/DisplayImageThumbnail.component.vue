<template>
    <div>
        <el-image :src="thumbnail">
            <template #error>
                <div class="h-40 bg-gray-100 text-sm p-2 text-center">
                    thumbnail not yet available
                </div>
            </template>
        </el-image>
    </div>
</template>

<script>
export default {
    props: {
        thumbnail: {
            type: String,
            required: true,
        },
    },
    data() {
        return {};
    },
};
</script>
