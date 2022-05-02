<template>
    <div class="flex flex-col">
        <el-table :data="items">
            <template #empty>You have no items. Get started by creating an item.</template>
            <el-table-column prop="name" label="Name"> </el-table-column>
            <el-table-column prop="type" label="Type" width="150"> </el-table-column>
            <el-table-column label="Actions" width="100">
                <template #default="scope">
                    <el-button
                        type="primary"
                        @click="linkItemToCollection(scope.row)"
                        :disabled="loading"
                    >
                        <i class="fa-solid fa-link"></i>
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>

<script>
import { ElMessage } from "element-plus";
export default {
    props: {
        link: {
            type: String,
            required: true,
            validator: function (value) {
                return ["collections", "items", "all"].includes(value);
            },
        },
        property: {
            type: String,
            required: true,
            validator: function (value) {
                return ["hasMember", "memberOf"].includes(value);
            },
        },
    },
    data() {
        return {
            loading: false,
            identifier: this.$route.params.identifier,
            items: [],
        };
    },
    async mounted() {
        if (this.link === "items") {
            let items = await this.getMyItems();
            this.items = [...items];
        } else if (this.link === "collections") {
            let collections = await this.getMyCollections();
            this.items = [...collections];
        } else {
            let items = await this.getMyItems();
            let collections = await this.getMyCollections();
            this.items = [...items, ...collections];
        }
    },
    methods: {
        async getMyItems() {
            let response = await this.$http.get({
                route: `/items`,
            });
            if (response.status === 200) {
                response = await response.json();
                let items = response.items.map((i) => ({ name: i, type: "item" }));
                if (this.$route.path.match("/items")) {
                    items = items.filter((c) => c.name !== this.identifier);
                }
                return items;
            }
        },
        async getMyCollections() {
            let response = await this.$http.get({
                route: `/collections`,
            });
            if (response.status === 200) {
                response = await response.json();
                let collections = response.collections.map((i) => ({
                    name: i,
                    type: "collection",
                }));
                if (this.$route.path.match("/collections")) {
                    collections = collections.filter((c) => c.name !== this.identifier);
                }
                return collections;
            }
        },
        async linkItemToCollection(item) {
            this.loading = true;
            let reverseProperty = this.property === "hasMember" ? "memberOf" : "hasMember";

            let updates = {
                source: {
                    identifier: this.identifier,
                    entities: [
                        {
                            "@id": "./",
                            "@type": "Dataset",
                            [this.property]: [{ "@id": `arcp://name,/nyingarn.net/${item.name}` }],
                        },
                        {
                            "@id": `arcp://name,/nyingarn.net/${item.name}`,
                            "@type": "URL",
                        },
                    ],
                },
                target: {
                    identifier: item.name,
                    entities: [
                        {
                            "@id": "./",
                            "@type": "Dataset",
                            [reverseProperty]: [
                                { "@id": `arcp://name,/nyingarn.net/${this.identifier}` },
                            ],
                        },
                        {
                            "@id": `arcp://name,/nyingarn.net/${this.identifier}`,
                            "@type": "URL",
                        },
                    ],
                },
            };
            let response = await this.$http.post({
                route: "/describo/update",
                body: { updates },
            });
            if (response.status === 200) {
                ElMessage({
                    message: "item linked",
                    type: "success",
                });
            } else {
                ElMessage({
                    message: "There was an issue creating the item link",
                    type: "error",
                });
                console.error(await response.json());
            }
            this.loading = false;
        },
    },
};
</script>
