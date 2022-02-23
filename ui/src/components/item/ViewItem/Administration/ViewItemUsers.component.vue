<template>
    <div class="flex flex-col">
        <div class="text-gray-600">The following people have access to this item:</div>
        <el-table :data="users" class="w-full my-2 p-2">
            <el-table-column prop="email" label="Email" width="400" />
            <el-table-column prop="givenName" label="Given Name" />
            <el-table-column prop="familyName" label="Family Name" />
        </el-table>
    </div>
</template>

<script>
export default {
    props: {
        users: {
            type: Array,
            required: true,
        },
    },
    data() {
        return {};
    },
};
</script>
