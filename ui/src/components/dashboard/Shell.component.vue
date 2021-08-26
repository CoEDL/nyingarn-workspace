<template>
    <div class="flex flex-col p-2"><my-items-component /></div>
</template>

<script>
import MyItemsComponent from "@/components/item/MyItems.component.vue";
export default {
    components: {
        MyItemsComponent,
    },
    setup() {},
};
</script>
