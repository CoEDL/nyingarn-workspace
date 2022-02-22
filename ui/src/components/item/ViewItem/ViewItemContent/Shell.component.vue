<template>
    <div class="flex flex-col">
        <div class="flex flex-row">
            <el-pagination
                v-model:currentPage="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 20, 30, 40]"
                layout="total, sizes, prev, pager, next"
                :total="total"
                @size-change="pageSizeChange"
                @current-change="init"
            >
            </el-pagination>
        </div>

        <div class="flex flex-row flex-wrap overflow-scroll" :style="{ height: panelHeight }">
            <view-item-component
                class="cursor-pointer m-2 h-80"
                v-for="resource in resources"
                :key="resource"
                :resource="resource"
                @refresh="init"
            />
        </div>
    </div>
</template>

<script>
import ViewItemComponent from "./ViewItem.component.vue";

export default {
    components: {
        ViewItemComponent,
    },
    data() {
        return {
            identifier: this.$route.params.identifier,
            resources: [],
            total: undefined,
            currentPage: 1,
            pageSize: 10,
            panelHeight: `${window.innerHeight - 180}px`,
        };
    },
    mounted() {
        this.init();
    },
    methods: {
        async init() {
            let limit = this.pageSize;
            let offset = (this.currentPage - 1) * this.pageSize;

            let response = await this.$http.get({
                route: `/items/${this.identifier}/resources?offset=${offset}&limit=${limit}`,
            });
            if (response.status !== 200) {
                console.error(
                    `Error getting item resources`,
                    response.status,
                    await response.json()
                );
            }
            let { resources, total } = await response.json();

            this.resources = [...resources];
            this.total = total;
        },
        pageSizeChange() {
            this.currentPage = 1;
            this.init();
        },
    },
};
</script>

l
