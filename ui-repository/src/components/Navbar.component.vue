<template>
    <div class="flex flex-row space-x-2 p-2 bg-nyingarn-dark">
        <RouterLink to="/" class="flex flex-row space-x-2">
            <div><el-image :src="NyingarnLogo" class="h-10" /></div>
            <div class="pt-1 text-2xl font-thin text-nyingarn-light">Nyingarn Repository</div>
        </RouterLink>
        <div class="flex-grow"></div>
        <DropDownComponent control-name="login" class="mt-1 w-96 -ml-80" v-if="!user?.id">
            <template #content>
                <MagicLinkComponent />
            </template>
        </DropDownComponent>
        <div v-else="user.id" class="flex flex-row space-x-2 pt-1">
            <div class="text-white pt-1">
                <i class="fa-solid fa-user"></i> {{ user.givenName }} {{ user.familyName }}
            </div>
            <div>
                <el-button @click="logout"
                    ><i class="fa-solid fa-right-from-bracket"></i
                ></el-button>
            </div>
        </div>
    </div>
</template>

<script setup>
import DropDownComponent from "./DropDown.component.vue";
import MagicLinkComponent from "./authentication/MagicLink.component.vue";
import { ElButton, ElImage } from "element-plus";
import NyingarnLogo from "../assets/nyingarn-logo-notext.png";
import { computed } from "vue";
import { useStore } from "vuex";
const $store = useStore();
import { tokenSessionKey, removeLocalStorage } from "../storage.js";

const user = computed(() => $store.state.user);

function logout() {
    removeLocalStorage({ key: tokenSessionKey });
    $store.commit("setUserData", {});
}
</script>
