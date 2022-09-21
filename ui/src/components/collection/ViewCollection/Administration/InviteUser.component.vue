<template>
    <div class="flex flex-col">
        <view-collection-users-component :users="users" @refresh="getCollectionUsers" />

        <div class="mt-6">
            <div class="text-gray-600">Invite users to work on this collection with you</div>
            <div class="flex flex-col my-2">
                <div class="flex flex-row">
                    <div class="flex-grow">
                        <el-input v-model="email" placeholder="Search by user email address" />
                    </div>
                    <div>
                        <el-button @click="attachUser">attach user</el-button>
                    </div>
                </div>
                <div class="text-xs text-gray-600">
                    Invite users by their email address. You will need to provide their email
                    exactly as the system knows it in order to find them.
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { attachUser, getCollectionUsers } from "@/components/collection/collection-services";
import ViewCollectionUsersComponent from "./ViewCollectionUsers.component.vue";

export default {
    components: {
        ViewCollectionUsersComponent,
    },
    data() {
        return { identifier: this.$route.params.identifier, email: undefined, users: [] };
    },
    mounted() {
        this.getCollectionUsers();
    },
    methods: {
        async attachUser() {
            let response = await attachUser({
                $http: this.$http,
                identifier: this.identifier,
                email: this.email,
            });
            if (response.status === 200) {
                this.getCollectionUsers();
            }
            this.email = undefined;
        },
        async getCollectionUsers() {
            let response = await getCollectionUsers({
                $http: this.$http,
                identifier: this.identifier,
            });
            if (response.status === 200) {
                this.users = (await response.json()).users;
            }
        },
    },
};
</script>
