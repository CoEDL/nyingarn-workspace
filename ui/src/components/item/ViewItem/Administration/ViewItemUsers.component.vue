<template>
    <div class="flex flex-col">
        <div class="text-gray-600">The following people have access to this item:</div>
        <el-table :data="users">
            <el-table-column prop="email" label="Email" width="400" />
            <el-table-column prop="givenName" label="Given Name" />
            <el-table-column prop="familyName" label="Family Name" />
            <el-table-column prop="administrator" label="Admin" width="100">
                <template #default="scope">
                    <div v-show="scope.row.administrator" class="text-green-600">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="operations" label="Operations" width="110">
                <template #default="scope">
                    <div v-if="!scope.row.administrator && !scope.row.loggedin">
                        <el-popconfirm
                            title="Are you sure you want to detach this user?"
                            @confirm="detachUser(scope.row)"
                        >
                            <template #reference>
                                <el-button type="danger">
                                    <i class="fa-solid fa-unlink"></i>
                                </el-button>
                            </template>
                        </el-popconfirm>
                    </div>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script>
import { ElMessage } from "element-plus";
import { detachUserFromItem } from "../../item-services.js";
export default {
    props: {
        users: {
            type: Array,
            required: true,
        },
    },
    data() {
        return { identifier: this.$route.params.identifier };
    },
    methods: {
        async detachUser({ id }) {
            let response = await detachUserFromItem({
                $http: this.$http,
                identifier: this.identifier,
                userId: id,
            });
            if (response.status !== 200) {
                ElMessage.success(`There was a problem detaching the user`);
            }
            this.$emit("refresh");
        },
    },
};
</script>
