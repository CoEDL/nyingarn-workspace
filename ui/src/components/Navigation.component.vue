<template>
    <div class="flex flex-row border-b border-solid py-4">
        <div class="text-xl text-gray-600 pl-4">{{ siteName }}</div>
        <div class="flex-grow"></div>
        <div class="text-lg text-gray-600 flex flex-row space-x-2 mr-6">
            <div v-show="user.administrator" class="text-yellow-600">
                <i class="fas fa-user-shield"></i>
            </div>
            <div v-show="!user.administrator" class="text-blue-600">
                <i class="fas fa-user"></i>
            </div>
            <div>
                {{ user.givenName }}
            </div>
        </div>
        <div>
            <el-button size="small" @click="logout"><i class="fas fa-sign-out-alt"></i></el-button>
        </div>
    </div>
</template>

<script>
import { tokenSessionKey, removeLocalStorage } from "@/components/storage";

export default {
    data() {
        return {
            siteName: this.$store.state.configuration.ui.siteName,
        };
    },
    computed: {
        user: function() {
            return this.$store.state.userData;
        },
    },
    mounted() {},
    methods: {
        async logout() {
            await this.$http.get({ route: "/logout" });
            removeLocalStorage({ key: tokenSessionKey });
            this.$router.push("/login");
        },
    },
};
</script>
