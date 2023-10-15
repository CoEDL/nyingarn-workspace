<template>
    <div class="flex flex-col space-y-4 items-center">
        <div class="flex-grow flex flex-row space-x-4 items-center my-10 text-center">
            <div class="">
                <ElImage :src="NyingarnLogo" class="h-20" />
            </div>
            <div class="text-nyingarn-dark text-2xl">
                Nyingarn makes manuscript sources for Australian Languages <br />available as
                searchable and reusable text documents
            </div>
        </div>

        <SearchComponent class="my-4" />
        <!-- <div class="text-sm text-gray-500">
            Search across name, description, language name, language code and language alternate
            name
        </div> -->
    </div>
</template>

<script setup>
import { ElImage } from "element-plus";
import { reactive } from "vue";
import NyingarnLogo from "../../assets/nyingarn-logo-notext.png";
import SearchComponent from "./Search.component.vue";

const data = reactive({});
</script>
