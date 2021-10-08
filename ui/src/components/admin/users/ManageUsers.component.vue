<template>
    <div class="flex flex-col">
        <el-pagination
            layout="prev, pager, next"
            :total="total"
            :page-size="limit"
            @current-change="paginate"
        ></el-pagination>
        <el-table :data="users" style="width: 100%">
            <el-table-column prop="email" label="Email" width="300" />
            <el-table-column prop="givenName" label="Given name" width="180" />
            <el-table-column prop="familyName" label="Family Name" width="180" />
            <el-table-column prop="locked" label="Locked" width="120">
                <template #header>
                    <i class="fas fa-lock"></i>
                </template>
                <template #default="scope">
                    <el-switch
                        v-model="scope.row.locked"
                        @change="toggle({ action: 'lock', user: scope.row })"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="upload" label="Upload" width="120">
                <template #header>
                    <i class="fas fa-upload"></i>
                </template>
                <template #default="scope">
                    <el-switch
                        v-model="scope.row.upload"
                        @change="toggle({ action: 'upload', user: scope.row })"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="administrator" label="Admin" width="120">
                <template #header>
                    <i class="fas fa-user-shield"></i>
                </template>
                <template #default="scope">
                    <el-switch
                        v-model="scope.row.administrator"
                        @change="toggle({ action: 'admin', user: scope.row })"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="" label="Delete" width="120">
                <template #header>
                    <i class="fas fa-user-minus"></i>
                </template>
                <template #default="scope">
                    <el-popconfirm
                        title="Are you sure to want to delete this user account?"
                        @confirm="deleteUser({ user: scope.row })"
                    >
                        <template #reference>
                            <el-button type="danger" size="small">
                                <i class="fas fa-trash-alt"></i>
                            </el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    data() {
        return {
            users: [],
            error: false,
            done: true,
            total: 0,
            offset: 0,
            limit: 10,
            loggedInUser: this.$store.state.user,
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            this.getUsers();
        },
        async getUsers() {
            let response = await httpService.get({
                route: `/admin/users?offset=${this.offset}&limit=${this.limit}`,
            });
            if (response.status !== 200) {
                this.error = true;
            }
            let data = await response.json();
            this.users = data.users.filter((u) => u.id !== this.loggedInUser.id);
            this.total = data.total;
        },
        paginate(page) {
            this.offset = (page - 1) * this.limit;
            this.getUsers();
        },
        async toggle({ action, user }) {
            let response;
            switch (action) {
                case "lock":
                    response = await httpService.put({ route: `/admin/users/${user.id}/lock` });
                    if (response.status !== 200) {
                        this.error = true;
                        return;
                    }
                    break;
                case "upload":
                    response = await httpService.put({
                        route: `/admin/users/${user.id}/upload`,
                    });
                    if (response.status !== 200) {
                        this.error = true;
                        return;
                    }
                    break;
                case "admin":
                    response = await httpService.put({
                        route: `/admin/users/${user.id}/admin`,
                    });
                    if (response.status !== 200) {
                        this.error = true;
                        return;
                    }
                    break;
            }
            this.done = true;
        },
        async deleteUser({ user }) {
            let response = await httpService.delete({
                route: `/admin/users/${user.id}`,
            });
            if (response.status !== 200) {
                this.error = true;
            }
            this.getUsers();
        },
    },
};
</script>
