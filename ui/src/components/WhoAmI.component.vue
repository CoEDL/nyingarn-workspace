<template>
    <div class="text-lg text-white flex flex-row space-x-2">
        <div v-show="user.administrator" class="text-yellow-600">
            <i class="fa-solid fa-user-shield"></i>
        </div>
        <div v-show="!user.administrator" class="text-white">
            <i class="fa-solid fa-user"></i>
        </div>
        <div>
            {{ user.givenName }}
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {};
    },
    computed: {
        user: function () {
            return this.$store.state.user;
        },
    },
    mounted() {},
};
</script>
