<template>
    <!-- <div class="flex flex-col">
        <div class="text-gray-700">Item Resources:</div>
        <div v-for="resource of resources" :key="resource">
            {{ resource }}
        </div>
    </div> -->
    <div></div>
</template>

<script>
// import { ref, onMounted, onBeforeUnmount } from "vue";
// import HTTPService from "@/http.service";
// const httpService = new HTTPService();

// export default {
//     props: {
//         identifier: {
//             type: String,
//             required: true,
//         },
//     },
//     setup(props) {
//         let resources = ref([]);
//         const getResources = async () => {
//             let response = await httpService.get({ route: `/items/${props.identifier}/resources` });
//             if (response.status !== 200) {
//                 console.error(
//                     `Error getting item resources`,
//                     response.status,
//                     await response.json()
//                 );
//             }
//             resources.value = (await response.json()).resources;
//         };
//         let interval = setInterval(getResources, 10000);
//         onMounted(getResources);
//         onBeforeUnmount(() => {
//             try {
//                 clearInterval(interval);
//             } catch (error) {}
//         });

//         return {
//             resources,
//         };
//     },
// };
</script>
