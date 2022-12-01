<template>
    <div class="flex flex-col">
        <view-item-users-component :users="data.users" @refresh="loadItemUsers" />

        <div class="mt-6">
            <div class="text-gray-600">Invite users to work on this item with you</div>
            <div class="flex flex-col my-2">
                <div class="flex flex-row">
                    <div class="flex-grow">
                        <el-input
                            type="textarea"
                            rows="5"
                            v-model="data.emails"
                            placeholder="Search by user email address"
                        />
                    </div>
                    <div>
                        <el-button @click="attachUsers">attach user</el-button>
                    </div>
                </div>
                <div class="text-xs text-gray-600">
                    Invite users by their email address. You will need to provide their email
                    exactly as the system knows it in order to find them. Specify multiple users by
                    comma or one per line.
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { attachUser, getItemUsers } from "@/components/item/item-services";
import ViewItemUsersComponent from "./ViewItemUsers.component.vue";
import { flattenDeep } from "lodash";
import { reactive, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    emails: undefined,
    users: [],
});
onMounted(() => {
    loadItemUsers();
});
async function attachUsers() {
    let emails = data.emails.split("\n").map((line) => line.split(",").map((e) => e.trim()));
    emails = flattenDeep(emails);
    await Promise.all(
        emails.map((email) => {
            return attachUser({
                $http,
                identifier: $route.params.identifier,
                email,
            });
        })
        // data.emails = undefined;
    );
    loadItemUsers();
    data.emails = undefined;
}
async function loadItemUsers() {
    let response = await getItemUsers({
        $http,
        identifier: $route.params.identifier,
    });
    if (response.status === 200) {
        data.users = (await response.json()).users;
    }
}
</script>
