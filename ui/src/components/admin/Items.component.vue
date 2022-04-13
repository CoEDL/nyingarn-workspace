<template>
    <div class="flex flex-col space-y-2 xl:flex-row xl:space-x-2 xl:space-y-0">
        <el-card class="box-card xl:w-1/2">
            <template #header>
                <div class="card-header flex flex-row">
                    <div>Collections</div>
                </div>
            </template>
            <el-table :data="collections" :height="tableHeight" size="small">
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <div class="flex flex-row">
                            <el-button
                                type="primary"
                                @click="connectCollection(scope.row)"
                                size="small"
                            >
                                connect
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-card class="box-card xl:w-1/2">
            <template #header>
                <div class="card-header flex flex-row">
                    <div>Items</div>
                </div>
            </template>
            <el-table :data="items" :height="tableHeight" size="small">
                <el-table-column prop="name" label="Name"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <div class="flex flex-row">
                            <el-button type="primary" @click="connectItem(scope.row)" size="small">
                                connect
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<script>
export default {
    data() {
        return { items: [], collections: [] };
    },
    computed: {
        tableHeight() {
            if (window.innerWidth > 1280) {
                return window.innerHeight - 250;
            } else {
                return 300;
            }
        },
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            let response = await this.$http.get({ route: "/admin/entries" });
            if (response.status !== 200) {
                // report error
            }
            let { items, collections } = await response.json();
            this.items = [...items];
            this.collections = [...collections];
        },
        async connectItem(item) {
            await this.$http.put({ route: `/admin/items/${item.name}/connect-user` });
            this.$router.push(`/items/${item.name}/view`);
        },
        async connectCollection(collection) {
            await this.$http.put({ route: `/admin/collections/${collection.name}/connect-user` });
            this.$router.push(`/collections/${collection.name}/metadata`);
        },
    },
};
</script>
