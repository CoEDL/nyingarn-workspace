<template>
    <div class="flex flex-col space-y-2">
        <iframe :src="termsUrl" class="w-full pt-1" style="height: 800px"></iframe>
        <div class="flex flex-row space-x-2">
            <div class="text-lg">
                To use the workspace you agree to abide by the terms and conditions of use.
            </div>
            <div><el-button @click="agree" type="success" size="small">I agree</el-button></div>
        </div>
    </div>
</template>

<script>
import HTTPService from "@/http.service";
const httpService = new HTTPService();
import {
    loginSessionKey,
    tokenSessionKey,
    putLocalStorage,
    getLocalStorage,
    removeLocalStorage,
} from "@/components/storage";

export default {
    data() {
        return {
            termsUrl: this.$store.state.configuration.ui.termsAndConditionsOfUse,
            user: this.$store.state.user,
        };
    },
    methods: {
        async agree() {
            let response = await httpService.put({
                route: `/users/${this.user.id}/upload`,
            });
            if (response.status === 200) {
                let { token } = await response.json();
                let user = JSON.parse(atob(token.split(".")[1]));
                this.$store.commit("setUserData", user);
                putLocalStorage({ key: tokenSessionKey, data: { token } });
            }
        },
    },
};
</script>
