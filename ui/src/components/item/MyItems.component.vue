<template>
    <div class="flex flex-col rounded border border-gray-200 p-2">
        <div class="text-lg">Your items:</div>
        <el-pagination
            layout="prev, pager, next"
            :page-size="limit"
            hide-on-single-page
            :total="total"
            @current-change="loadItems"
        >
        </el-pagination>
        <div v-for="(item, idx) of items" :key="idx" class="my-1 text-yellow-500">
            <router-link :to="item.link">{{ item.name }}</router-link>
        </div>
    </div>
</template>

<script>
import { ref, onMounted } from "vue";
import HTTPService from "@/http.service";
const httpService = new HTTPService();

export default {
    data() {
        let items = ref([]);
        let page = ref(1);
        let limit = ref(10);
        let total = ref(0);
        const loadItems = async (p) => {
            page.value = p ? p : page.value;
            let offset = (page.value - 1) * limit.value;
            let response = await httpService.get({
                route: `/items?offset=${offset}&limit=${limit.value}`,
            });
            if (response.status !== 200) {
                // handle the error
            }
            response = await response.json();
            items.value = response.items.map((item) => ({ name: item, link: `/items/${item}` }));
            total.value = response.total;
        };

        onMounted(loadItems);
        return {
            items,
            page,
            limit,
            total,
            loadItems,
        };
    },
};
</script>
