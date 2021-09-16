<template>
    <div>
        <div>
            <el-button @click="createNewItem = !createNewItem" size="small">
                <i class="fas fa-plus"></i> Create a new item
            </el-button>
        </div>
        <el-dialog title="Create a new Item" v-model="createNewItem" width="80%" destroy-on-close>
            <div class="text-gray-600">
                <div class="flex flex-col space-y-2">
                    <div class="flex flex-row">
                        <div class="text-sm text-gray-600">
                            Please define an identifier for this item.
                        </div>
                        <div class="flex-grow"></div>
                        <div v-if="error?.code" class="text-red-800">
                            Error: {{ error.message }}
                        </div>
                    </div>
                    <div class="w-full">
                        <el-input
                            placeholder="item identifier"
                            v-model="identifier"
                            @input="checkNameStructure"
                        ></el-input>
                    </div>
                    <div class="text-xs text-gray-600" :class="{ 'text-red-600': error }">
                        {{ help }}
                    </div>
                    <div>
                        <el-button
                            type="primary"
                            @click="createItemEntry"
                            :disabled="!identifier.length || error"
                        >
                            Create this item
                        </el-button>
                    </div>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    data() {
        return {
            identifier: "",
            createNewItem: false,
            error: false,
            help: this.$store.state.configuration.ui.itemName.help,
        };
    },
    methods: {
        checkNameStructure() {
            if (this.$store.state.configuration.ui.itemName?.checkNameStructure) {
                let regex = new RegExp(
                    this.$store.state.configuration.ui.itemName.checkNameStructure
                );
                if (!this.identifier.match(regex)) {
                    this.error = true;
                } else {
                    this.error = false;
                }
            }
        },
        async createItemEntry() {
            let response = await httpService.post({
                route: "/items",
                body: { identifier: this.identifier },
            });
            if (response.status === 200) {
                this.error = false;
                this.createNewItem = false;
                this.$router.push(`/items/${this.identifier}`);
                this.identifier = "";
            } else {
                this.identifier = "";
                this.error = await response.json();
            }
        },
    },
};
</script>
