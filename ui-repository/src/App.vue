<template>
    <div class="h-screen w-screen bg-slate-100">
        <NavbarComponent />
        <router-view />
    </div>
</template>

<script setup>
import NavbarComponent from "./components/Navbar.component.vue";
</script>
