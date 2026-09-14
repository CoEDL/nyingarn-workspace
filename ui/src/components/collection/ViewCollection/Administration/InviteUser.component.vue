<template>
    <div class="flex flex-col">
        <view-collection-users-component :users="data.users" @refresh="loadCollectionUsers" />

        <div class="mt-6">
            <div class="text-gray-600">Invite users to work on this collection with you</div>
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
                        <el-button @click="inviteUsers">invite user</el-button>
                    </div>
                </div>
                <div class="text-xs text-gray-600">
                    Invite users by their email address. You will need to provide their email
                    exactly as the system knows it in order to find them. Specify multiple users by
                    comma or one per line.
                </div>
                <el-checkbox v-model="data.includeItems" class="mt-2">
                    Also give access to every item in this collection
                </el-checkbox>
            </div>
        </div>
    </div>
</template>

<script setup>
import { inviteUser, getCollectionUsers } from "../../collection-services.js";
import ViewCollectionUsersComponent from "./ViewCollectionUsers.component.vue";
import { flattenDeep } from "lodash";
import { ElMessage } from "element-plus";
import { reactive, onMounted, inject } from "vue";
import { useRoute } from "vue-router";
const $route = useRoute();
const $http = inject("$http");

const data = reactive({
    emails: undefined,
    includeItems: false,
    users: [],
});
onMounted(() => {
    loadCollectionUsers();
});
async function inviteUsers() {
    let emails = data.emails.split("\n").map((line) => line.split(",").map((e) => e.trim()));
    emails = flattenDeep(emails);
    const responses = await Promise.all(
        emails.map(async (email) => {
            const response = await inviteUser({
                $http,
                identifier: $route.params.identifier,
                email,
                includeItems: data.includeItems,
            });
            return { email, response };
        })
    );
    if (data.includeItems) {
        for (const { email, response } of responses) {
            if (response.status === 200) reportItemAccess({ email, ...(await response.json()) });
        }
    }
    loadCollectionUsers();
    data.emails = undefined;
}
function reportItemAccess({ email, granted, skipped }) {
    const total = granted.length + skipped.length;
    let message = `Gave ${email} access to the collection and ${granted.length} of ${total} items.`;
    if (skipped.length) {
        const list = skipped.map((s) => `${s.identifier} (${s.reason})`).join(", ");
        message += ` Skipped: ${list}`;
    }
    ElMessage({ message, type: skipped.length ? "warning" : "success", duration: 8000 });
}
async function loadCollectionUsers() {
    let response = await getCollectionUsers({
        $http,
        identifier: $route.params.identifier,
    });
    if (response.status === 200) {
        data.users = (await response.json()).users;
    }
}
</script>
