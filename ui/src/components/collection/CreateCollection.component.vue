<template>
    <div>
        <div @click="createNewCollection = !createNewCollection" class="cursor-pointer">
            <span class="fa-layers fa-fw">
                <i class="fa-solid fa-file-image" data-fa-transform="left-4 up-4"></i>
                <i class="fa-solid fa-file-image" data-fa-transform="right-4 down-4"></i>
            </span>
            Create collection
        </div>
        <el-dialog
            title="Create a new Collection"
            v-model="createNewCollection"
            width="80%"
            destroy-on-close
        >
            <div class="text-gray-600">
                <div class="flex flex-col space-y-2">
                    <div class="flex flex-row">
                        <div class="text-sm text-gray-600">
                            Please define an identifier for this collection.
                        </div>
                        <div class="flex-grow"></div>
                        <div v-if="error?.code" class="text-red-800">
                            Error: {{ error.message }}
                        </div>
                    </div>
                    <div class="w-full">
                        <el-input
                            placeholder="collection identifier"
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
                            @click="createCollectionEntry"
                            :disabled="!identifier.length || error"
                        >
                            Create this collection
                        </el-button>
                    </div>
                </div>
            </div>
        </el-dialog>
    </div>
</template>

<script>
import { createCollection } from "./collection-services";
export default {
    data() {
        return {
            identifier: "",
            createNewCollection: false,
            error: false,
            help: this.$store.state.configuration.ui.collectionName.help,
        };
    },
    methods: {
        checkNameStructure() {
            if (this.$store.state.configuration.ui.collectionName?.checkNameStructure) {
                let regex = new RegExp(
                    this.$store.state.configuration.ui.collectionName.checkNameStructure
                );
                if (!this.identifier.match(regex)) {
                    this.error = true;
                } else {
                    this.error = false;
                }
            }
        },
        async createCollectionEntry() {
            let response = await createCollection({
                $http: this.$http,
                identifier: this.identifier,
            });
            if (response.status === 200) {
                this.error = false;
                this.createNewCollection = false;
                this.$router.push(`/collections/${this.identifier}`);
                this.identifier = "";
            } else {
                this.identifier = "";
                this.error = await response.json();
            }
        },
    },
};
</script>
