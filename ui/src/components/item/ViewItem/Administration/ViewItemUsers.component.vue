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
import { getItemUsers } from "@/components/item/load-item-data";
export default {
    data() {
        return { identifier: this.$route.params.identifier, users: [] };
    },
    mounted() {
        this.getItemUsers();
    },
    methods: {
        async getItemUsers() {
            let response = await getItemUsers({
                $http: this.$http,
                identifier: this.identifier,
            });
            if (response.status === 200) {
                this.users = (await response.json()).users;
            }
        },
    },
};
</script>
