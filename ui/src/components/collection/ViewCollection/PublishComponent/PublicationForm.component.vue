<template>
    <div class="flex flex-col">
        <div v-loading="data.loading" :class="{ 'h-40': data.loading }">
            <el-form :model="data.form" label-width="150px" @submit.prevent>
                <el-form-item label="Status">
                    <status-badge-component :status="data.status" />
                </el-form-item>
                <el-form-item label="Your Identifier">
                    <el-input v-model="data.user.identifier" />
                    <div class="text-gray-700">
                        Ideally, this is *your* ORCID or other similarly unique URL identifier.
                        However, if you don't have one, just leave this field blank.
                    </div>
                </el-form-item>
                <el-form-item label="Your Name">
                    <div>{{ data.user.givenName }} {{ data.user.familyName }}</div>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="publish"> Publish this item </el-button>
                    <el-button
                        @click="
                            data.confirmed = false;
                            data.checked = [];
                        "
                        v-if="data.status === 'inProgress'"
                    >
                        Cancel
                    </el-button>
                </el-form-item>
            </el-form>
        </div>
        <div v-if="data.loading && data.publishLogs.length">
            <el-table :data="data.publishLogs">
                <el-table-column prop="msg" label="" />
                <el-table-column prop="date" label="Date" width="250" />
            </el-table>
        </div>
    </div>
</template>

<script setup>
import StatusBadgeComponent from "../../../StatusBadge.component.vue";
import { reactive, computed, inject, onMounted } from "vue";
import { flattenDeep } from "lodash";
import { io } from "socket.io-client";
import { useRoute } from "vue-router";
import { isEmail } from "validator";
import { parseISO, format } from "date-fns";
const $route = useRoute();
const $http = inject("$http");
const $socket = io();
$socket.on("publish-collection", ({ msg, date }) => {
    data.publishLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});

const data = reactive({
    loading: false,
    checkingPermissionFormsLoaded: false,
    user: {},
    status: "",
    showNarrativeRequirement: false,
    form: {
        orcid: "",
        visibility: "open",
        emails: "",
    },
    publishLogs: [],
});
const identifier = computed(() => $route.params.identifier);

onMounted(() => {
    getUserData();
    getPublicationStatus();
});
async function getUserData() {
    let response = await $http.get({ route: "/users/self" });
    response = await response.json();
    data.user = { ...response.user };
}
async function getPublicationStatus() {
    let response = await $http.get({
        route: `/publish/collections/${$route.params.identifier}/status`,
    });
    if (response.status === 200) {
        response = await response.json();
        data.status = response.status;
        data.form.visibility = response.visibility;
    }
}
async function publish() {
    data.publishLogs = [];
    const formData = {
        user: {
            "@id": data.user.identifier
                ? data.user.identifier
                : `#${data.user.givenName} ${data.user.familyName}`.replace(/ /g, "_"),
            "@type": "Person",
            name: `${data.user.givenName} ${data.user.familyName}`,
        },
        access: {
            visibility: data.form.visibility,
        },
    };

    data.loading = true;
    await $http.post({
        route: `/publish/collections/${$route.params.identifier}`,
        params: { clientId: $socket.id },
        body: { ...formData },
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    data.loading = false;
    getPublicationStatus();
}
</script>
