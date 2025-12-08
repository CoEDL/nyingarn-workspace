<template>
    <div class="pb-16 w-screen bg-slate-100">
        <NavbarComponent />
        <router-view />
    </div>
    <TermsAndConditionsComponent
        :visible="showTerms"
        @accept="handleTermsAccept"
    />
</template>

<script setup>
import { ref } from "vue";
import NavbarComponent from "./components/Navbar.component.vue";
import TermsAndConditionsComponent from "./components/TermsAndConditions.component.vue";
import {
    termsAcceptedKey,
    getLocalStorage,
    putLocalStorage,
} from "./storage.js";

const showTerms = ref(!getLocalStorage({ key: termsAcceptedKey }));

const handleTermsAccept = () => {
    putLocalStorage({ key: termsAcceptedKey, data: true });
    showTerms.value = false;
};
</script>
