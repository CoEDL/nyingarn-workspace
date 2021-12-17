<template>
    <div class="flex flex-col p-4">
        <div class="text-lg">Your items:</div>
        <el-pagination
            layout="prev, pager, next"
            :page-size="limit"
            :total="total"
            @current-change="loadItems"
        >
        </el-pagination>
        <div class="w-full lg:w-3/5">
            <el-table :data="items">
                <el-table-column prop="name" label="Name">
                    <template #default="scope">
                        <router-link :to="scope.row.link">{{ scope.row.name }}</router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="resourceTotal" label="Resources" width="100">
                </el-table-column>
            </el-table>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            page: 1,
            limit: 10,
            total: 0,
            items: [],
        };
    },
    mounted() {
        this.loadItems();
    },
    methods: {
        async loadItems(p) {
            if (p) this.page = p;
            let offset = (this.page - 1) * this.limit;
            let response = await this.$http.get({
                route: `/items`,
                params: { offset, limit: this.limit },
            });
            if (response.status !== 200) {
                return;
            }
            response = await response.json();
            this.total = response.total;
            let items = response.items.map((i) => ({ name: i }));
            this.items = items.map((i) => ({ name: i.name, link: `/items/${i.name}/view` }));

            items = [];
            for (let item of this.items) {
                response = await this.$http.get({ route: `/items/${item.name}/status` });
                if (response.status == 200) {
                    let { statistics } = await response.json();
                    item = {
                        ...item,
                        ...statistics,
                    };
                    items.push(item);
                }
                this.items = [...items];
            }
        },
    },
};
</script>
