<template>
    <div class="pb-16 w-screen bg-slate-100">
        <NavbarComponent />
        <router-view />
    </div>
</template>

<script setup>
import NavbarComponent from "./components/Navbar.component.vue";
import { tokenSessionKey, getLocalStorage } from "./storage.js";
import { useStore } from "vuex";
const $store = useStore();

let data = getLocalStorage({ key: tokenSessionKey });
if (data) {
    let user = JSON.parse(atob(data.token.split(".")[1]));
    $store.commit("setUserData", user);
}
</script>
