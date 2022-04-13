<template>
    <el-card class="box-card flex flex-col">
        <template #header>
            <div class="card-header flex flex-row">
                <div>Items</div>
                <div class="flex-grow"></div>
                <el-pagination
                    layout="prev, pager, next"
                    :page-size="limit"
                    :total="total"
                    @current-change="loadItems"
                >
                </el-pagination></div
        ></template>
        <div class="w-full">
            <el-table :data="items" :height="tableHeight" size="small">
                <template #empty>You have no items. Get started by creating an item.</template>
                <el-table-column prop="name" label="">
                    <template #default="scope">
                        <router-link :to="scope.row.link">{{ scope.row.name }}</router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="total" label="Pages" width="100"> </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <el-popconfirm
                            title="Are you sure you want to delete this item? All data will be removed and this can't be undone."
                            @confirm="deleteItem(scope.row)"
                        >
                            <template #reference>
                                <el-button type="danger" size="small">
                                    <i class="fa-solid fa-trash"></i>
                                </el-button>
                            </template>
                        </el-popconfirm>
                    </template>
                </el-table-column>
            </el-table>
        </div>
    </el-card>
</template>

<script>
import { ElMessage } from "element-plus";
import { orderBy } from "lodash";

export default {
    data() {
        return {
            page: 1,
            limit: 10,
            total: 0,
            items: [],
        };
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
            items = items.map((i) => ({
                name: i.name,
                link: `/items/${i.name}/view`,
                statistics: {},
            }));
            items = orderBy(items, "name");
            this.items = [...items];

            for (let item of this.items) {
                response = await this.$http.get({ route: `/items/${item.name}/status` });
                if (response.status == 200) {
                    let { statistics } = await response.json();
                    item = {
                        ...item,
                        ...statistics,
                    };
                    this.items = this.items.map((i) => {
                        return i.name === item.name ? item : i;
                    });
                    await new Promise((resolve) => setTimeout(resolve, 10));
                }
            }
        },
        async deleteItem(item) {
            try {
                await this.$http.delete({
                    route: `/items/${item.name}`,
                });
                this.loadItems();
            } catch (error) {
                ElMessage.error(`Something went wrong deleting this item`);
            }
        },
    },
};
</script>
