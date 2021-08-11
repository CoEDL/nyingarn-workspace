<template>
    <div>
        <div class="flex flex-row space-x-2" @click="login">
            <div><img :src="imageFile" class="h-10" /></div>
            <div class="text-gray-600 text-lg leading-relaxed pt-1">
                {{ this.buttonText }}
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        image: {
            type: String,
            required: true,
        },
        provider: {
            type: String,
            required: true,
        },
        buttonText: {
            type: String,
            required: true,
        },
    },
    data() {
        return {
            configuration: this.$store.state.configuration.services[this.provider],
            scope: "openid profile email",
            imageFile: require(`@/assets/${this.image}`),
        };
    },
    mounted() {},
    methods: {
        async login() {
            let response = await this.$http.get({ route: `/auth/${this.provider}/login` });
            if (response.status !== 200) {
                // disabled this login type for now
            }
            let { url, code_verifier } = await response.json();
            window.localStorage.setItem("login-session-data", JSON.stringify({ code_verifier }));
            window.location.href = url;
        },
    },
};
</script>
