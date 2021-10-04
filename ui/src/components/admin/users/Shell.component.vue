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
            <el-table-column prop="provider" label="AuthProvider" width="180" />
            <el-table-column prop="administrator" label="Admin" width="180" />
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
            total: 0,
            offset: 0,
            limit: 10,
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
            this.users = [...data.users];
            this.total = data.total;
        },
        paginate(page) {
            this.offset = page - 1 * this.limit;
            this.getUsers();
        },
    },
};
</script>
