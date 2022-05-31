<template>
    <el-table :data="props.collection.members" class="w-full">
        <template #empty>This collection has no members defined.</template>
        <el-table-column prop="identifier" label="Name">
            <template #default="scope">
                <router-link :to="link(scope.row.type, scope.row.identifier)">{{
                    scope.row.identifier
                }}</router-link>
            </template>
        </el-table-column>
        <el-table-column prop="type" label="Type" width="150" />
    </el-table>
</template>

<script setup>
const props = defineProps({
    collection: { type: Object },
});

function link(type, name) {
    let basePath = type === "item" ? "items" : "collections";
    return `/${basePath}/${name}`;
}
</script>
