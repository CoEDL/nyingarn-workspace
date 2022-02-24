<template>
    <div class="flex flex-col">
        <div class="w-full">
            <el-table :data="items" :height="tableHeight">
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column label="Actions" width="400">
                    <template #default="scope">
                        <div class="flex flex-row">
                            <el-button type="primary" @click="connectItem(scope.row)">
                                connect
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return { items: [] };
    },
    computed: {
        tableHeight() {
            return window.innerHeight - 150;
        },
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            let response = await this.$http.get({ route: "/admin/items" });
            if (response.status !== 200) {
                // report error
            }
            let { items } = await response.json();
            this.items = [...items];
        },
        async connectItem(item) {
            await this.$http.put({ route: `/admin/items/${item.name}/connect-user` });
            this.$router.push(`/items/${item.name}/view`);
        },
    },
};
</script>
