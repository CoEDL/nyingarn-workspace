<template>
    <div class="flex flex-col space-y-4" v-loading="data.loading">
        <div class="p-8 bg-red-200 rounded">
            <div>
                <textarea v-model="data.synonyms" placeholder="add synonyms"></textarea>
            </div>
        </div>
        <div>
            <el-button @click="setSynonyms">set synonyms</el-button>
        </div>
    </div>
</template>

<script setup>
import { reactive, onMounted, onBeforeUnmount, inject } from "vue";

const $http = inject("$http");

let data = reactive({
    loading: true,
    synonyms: []
});

onMounted(async () => {
    await getSynonyms();
    // ({view} = setupCodeMirror());
});

onBeforeUnmount(async () => {
    await setSynonyms();
});

async function getSynonyms() {
    data.loading = true;
    let response = await $http.get({ route: `/search-synonyms` });
    data.synonyms = (await response.text())
    data.loading = false;
}

async function setSynonyms() {
    data.loading = true;
    await $http.post({
        route: `/search-synonyms`,
        body: data.synonyms
     });
    data.loading = false;
}
</script>
