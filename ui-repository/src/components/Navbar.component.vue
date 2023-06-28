<template>
    <div class="flex flex-row space-x-2 p-2 bg-nyingarn-dark">
        <RouterLink to="/" class="flex flex-row space-x-2">
            <div><el-image :src="NyingarnLogo" class="h-10" /></div>
            <div class="pt-1 text-2xl font-thin text-nyingarn-light">Nyingarn Repository</div>
        </RouterLink>
    </div>
</template>

<script setup>
import { ElImage } from "element-plus";
import NyingarnLogo from "../assets/nyingarn-logo-notext.png";
</script>
