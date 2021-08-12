<template>
    <button class="flex-grow flex flex-row space-x-2" @click="login">
        <div><img :src="imageFile" class="h-10" /></div>
        <div class="text-gray-600 text-lg leading-relaxed pt-1">
            {{ this.buttonText }}
        </div>
    </button>
</template>

<script>
import { loginSessionKey, putLocalStorage } from "@/components/storage";

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
            configuration: this.$store.state.configuration.authentication[this.provider],
            scope: "openid profile email",
            imageFile: require(`@/assets/${this.image}`),
            loggingIn: false,
        };
    },
    mounted() {},
    methods: {
        async login() {
            this.loggingIn = true;
            let response = await this.$http.get({ route: `/auth/${this.provider}/login` });
            if (response.status !== 200) {
                // disabled this login type for now
            }
            let { url, code_verifier } = await response.json();
            putLocalStorage({ key: loginSessionKey, data: { code_verifier } });
            window.location.href = url;
        },
    },
};
</script>
