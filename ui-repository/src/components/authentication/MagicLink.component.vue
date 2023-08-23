<template>
    <div class="flex flex-row space-x-2">
        <div class="text-3xl text-green-600">
            <i class="fa-regular fa-envelope"></i>
        </div>
        <div class="flex flex-col flex-grow">
            <div class="flex flex-row flex-grow space-x-2">
                <el-input v-model="data.email" placeholder="Login with your email"></el-input>
                <div class="my-auto">
                    <el-button class="text-1xl" @click="login" :disabled="!data.email">
                        <i class="fa-solid fa-arrow-right"></i>
                    </el-button>
                </div>
            </div>
            <div v-if="data.linkSent" class="flex flex-row space-x-2">
                <div class="flex flex-col space-y-2 text-gray-700 text-sm">
                    <div>A login code has been sent to your email.</div>
                    <div>
                        Depending on your email service it could take a few minutes to arrive and it
                        might be in your SPAM folder.
                    </div>
                    <div>
                        You can close this window as the link in your email will open in a new
                        window.
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ElInput, ElButton } from "element-plus";
import { reactive, inject } from "vue";
const $http = inject("$http");

const data = reactive({ email: undefined, linkSent: false });

async function login() {
    let response = await $http.post({
        route: "/auth/email-login/repository",
        body: { email: data.email },
    });
    data.linkSent = true;
}
</script>
