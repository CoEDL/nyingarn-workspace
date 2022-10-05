<template>
    <el-card class="box-card flex flex-col">
        <template #header>
            <div class="card-header flex flex-row">
                <div>Collections</div>
                <div class="flex-grow"></div>
                <el-pagination
                    layout="prev, pager, next"
                    :page-size="limit"
                    :total="total"
                    @current-change="loadCollections"
                >
                </el-pagination>
            </div>
        </template>

        <div class="w-full">
            <el-table :data="collections" :height="tableHeight" size="small">
                <template #empty
                    >You have no collections. Get started by creating a collection.</template
                >
                <el-table-column prop="name" label="">
                    <template #default="scope">
                        <router-link :to="scope.row.link" class="text-base">{{
                            scope.row.name
                        }}</router-link>
                    </template>
                </el-table-column>
                <el-table-column prop="private" label="Private" width="150">
                    <template #default="scope">
                        <el-button
                            type="primary"
                            size="small"
                            @click="toggleCollectionVisibility(scope.row)"
                        >
                            <span v-show="scope.row.private">
                                <i class="fa-solid fa-lock"></i>
                            </span>
                            <span v-show="!scope.row.private">
                                <i class="fa-solid fa-lock-open"></i>
                            </span>
                        </el-button>
                    </template>
                </el-table-column>
                <el-table-column label="Actions" width="100">
                    <template #default="scope">
                        <el-popconfirm
                            title="Are you sure you want to delete this collection? All data will be removed and this can't be undone."
                            @confirm="deleteCollection(scope.row)"
                            confirmButtonType="danger"
                            cancelButtonType="primary"
                            width="300"
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
import {
    getMyCollections,
    deleteCollection,
    toggleCollectionVisibility,
} from "../collection/collection-services";

export default {
    data() {
        return {
            page: 1,
            limit: 10,
            total: 0,
            collections: [],
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
        this.loadCollections(this.page);
    },
    methods: {
        async loadCollections(p) {
            this.page = p ? p : 1;
            let offset = (this.page - 1) * this.limit;
            let response = await getMyCollections({ $http: this.$http, offset, limit: this.limit });
            if (response.status !== 200) {
                return;
            }
            response = await response.json();
            this.total = response.total;
            let collections = response.collections.map((c) => ({
                ...c,
                link: `/collections/${c.name}/metadata`,
            }));
            collections = orderBy(collections, "name");

            this.collections = [...collections];
        },
        async deleteCollection(collection) {
            try {
                await deleteCollection({ $http: this.$http, identifier: collection.name });
                this.loadCollections();
            } catch (error) {
                ElMessage.error(`Something went wrong deleting this collection`);
            }
        },
        async toggleCollectionVisibility(collection) {
            await toggleCollectionVisibility({
                $http: this.$http,
                identifier: collection.name,
            });
            await this.loadCollections();
        },
    },
};
</script>