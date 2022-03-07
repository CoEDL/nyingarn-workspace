<template>
    <div class="flex flex-col">
        <view-item-users-component
            :users="users"
            class="bg-gray-200 p-4 my-2"
            @refresh="getItemUsers"
        />

        <div class="bg-gray-200 p-4 my-2">
            <div class="text-gray-600">Invite users to work on this item with you</div>
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
import { attachUser, getItemUsers } from "@/components/item/load-item-data";
import ViewItemUsersComponent from "./ViewItemUsers.component.vue";

export default {
    components: {
        ViewItemUsersComponent,
    },
    data() {
        return { identifier: this.$route.params.identifier, email: undefined, users: [] };
    },
    mounted() {
        this.getItemUsers();
    },
    methods: {
        async attachUser() {
            let response = await attachUser({
                $http: this.$http,
                identifier: this.identifier,
                email: this.email,
            });
            if (response.status === 200) {
                this.getItemUsers();
            }
            this.email = undefined;
        },
        async getItemUsers() {
            let response = await getItemUsers({
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
