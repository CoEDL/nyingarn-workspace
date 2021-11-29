<template>
    <div class="flex flex-col">
        <div class="text-lg">Your items:</div>
        <el-pagination
            layout="prev, pager, next"
            :page-size="limit"
            :total="total"
            @current-change="loadItems"
        >
        </el-pagination>
        <el-table :data="items" style="width: 100%">
            <el-table-column prop="name" label="Name" width="450">
                <template #default="scope">
                    <router-link :to="scope.row.link">{{ scope.row.name }}</router-link>
                </template>
            </el-table-column>
            <el-table-column prop="thumbnails" label="Thumbnails" width="120">
                <template #default="scope">
                    <span v-show="scope.row.thumbnails" class="text-green-600">
                        <i class="fas fa-check"></i>
                    </span>
                    <span v-show="!scope.row.thumbnails" class="text-red-600">
                        <i class="fas fa-times"></i>
                    </span>
                </template>
            </el-table-column>
            <el-table-column prop="webformats" label="Webformats" width="120">
                <template #default="scope">
                    <span v-show="scope.row.webformats" class="text-green-600">
                        <i class="fas fa-check"></i>
                    </span>
                    <span v-show="!scope.row.webformats" class="text-red-600">
                        <i class="fas fa-times"></i>
                    </span>
                </template>
            </el-table-column>
            <el-table-column prop="ocr" label="OCR" width="120">
                <template #default="scope">
                    <span v-show="scope.row.ocr" class="text-green-600">
                        <i class="fas fa-check"></i>
                    </span>
                    <span v-show="!scope.row.ocr" class="text-red-600">
                        <i class="fas fa-times"></i>
                    </span>
                </template>
            </el-table-column>
        </el-table>
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
                route: `/items?offset=${offset}&limit=${this.limit}`,
            });
            if (response.status !== 200) {
                return;
            }
            response = await response.json();
            this.total = response.total;
            let items = response.items.map((i) => ({ name: i }));
            let itemData = [];
            for (let item of items) {
                response = await this.$http.get({ route: `/items/${item.name}/status` });
                if (response.status == 200) {
                    item = {
                        ...item,
                        ...(await response.json()),
                        link: `/items/${item.name}`,
                    };
                    itemData.push(item);
                }
            }
            this.items = itemData;
        },
    },
};
</script>
