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
                <el-form-item label="Permissions" v-loading="data.checkingPermissionFormsLoaded">
                    <div class="flex flex-col space-y-4">
                        <RightsHolderPermissionUploadComponent
                            v-if="!data.form.rightsHolderPermissionLoaded"
                            class="w-full"
                            @permission-loaded="getPermissionForms()"
                        />
                        <LanguageAuthorityPermissionUploadComponent
                            v-if="!data.form.languageAuthorityPermissionLoaded"
                            class="w-full"
                            @permission-loaded="getPermissionForms()"
                        />
                    </div>
                    <div
                        v-if="
                            data.form.rightsHolderPermissionLoaded &&
                            data.form.languageAuthorityPermissionLoaded
                        "
                    >
                        Permission forms loaded
                    </div>
                </el-form-item>
                <el-form-item label="TEI Document">
                    <GenerateCompleteTeiDocumentComponent
                        v-if="!data.teiGenerated"
                        @tei-generated="data.teiGenerated = true"
                    />
                    <div v-else>The complete TEI file has been generated and is up to date</div>
                </el-form-item>
                <el-form-item label="Visibility">
                    <div class="flex flex-col">
                        <el-switch
                            v-model="data.form.visibility"
                            inactive-text="This item is open access"
                            inactive-value="open"
                            active-text="This item is restricted to a defined set of users"
                            active-value="restricted"
                        />
                        <div class="text-gray-700">
                            In both cases, users will need to agree to the Nyingarn Terms and
                            Conditions of access.
                        </div>
                    </div>
                </el-form-item>
                <span v-if="data.form.visibility === 'restricted'">
                    <el-form-item label="Access Narrative">
                        <el-input v-model="data.form.narrative" :rows="8" type="textarea" />
                        <div class="flex flex-col">
                            <div class="text-gray-700">
                                Detail the reasoning for restricting access to this item.
                            </div>
                            <div class="text-red-600 text-lg" v-if="data.showNarrativeRequirement">
                                Restricted items can't be published without a narrative explaining
                                WHY they are restricted.
                            </div>
                        </div>
                    </el-form-item>
                    <el-form-item label="Review Date">
                        <el-date-picker
                            v-model="data.form.reviewDate"
                            type="date"
                            placeholder="Pick a day"
                        />
                        <div class="text-gray-700 ml-4">
                            After this date the item will become open access.
                        </div>
                    </el-form-item>
                    <el-form-item label="Authorised Users">
                        <el-input v-model="data.form.emails" :rows="8" type="textarea" />
                        <div class="text-gray-700">
                            List the email addresses of the people who are allowed to have access to
                            this item. One per line and/or separated by comma.
                        </div>
                    </el-form-item>
                </span>
                <el-form-item>
                    <el-button
                        type="primary"
                        @click="publish"
                        :disabled="data.permissionsNotLoaded || !data.teiGenerated"
                    >
                        Publish this item
                    </el-button>
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
import RightsHolderPermissionUploadComponent from "./RightsHolderPermissionUpload.component.vue";
import LanguageAuthorityPermissionUploadComponent from "./LanguageAuthorityPermissionUpload.component.vue";
import StatusBadgeComponent from "../../../StatusBadge.component.vue";
import GenerateCompleteTeiDocumentComponent from "./GenerateCompleteTeiDocument.component.vue";
import { reactive, computed, inject, onMounted } from "vue";
import { flattenDeep } from "lodash";
import { io } from "socket.io-client";
import { useRoute } from "vue-router";
import { isEmail } from "validator";
import { parseISO, format } from "date-fns";
const $route = useRoute();
const $http = inject("$http");
const $socket = io();
$socket.on("publish-item", ({ msg, date }) => {
    data.publishLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});
$socket.on("publish-collection", ({ msg, date }) => {
    data.publishLogs.push({ msg, date: format(parseISO(date), "PPpp") });
});

const data = reactive({
    loading: false,
    user: {},
    status: "",
    showNarrativeRequirement: false,
    form: {
        orcid: "",
        visibility: "open",
        emails: "",
        narrative: undefined,
        reviewDate: undefined,
        rightsHolderPermissionLoaded: false,
        languageAuthorityPermissionLoaded: false,
    },
    checkingPermissionFormsLoaded: false,
    permissionsNotLoaded: false,
    teiGenerated: false,
    publishLogs: [],
});
const identifier = computed(() => $route.params.identifier);

onMounted(() => {
    getUserData();
    getPublicationStatus();
    getPermissionForms();
});
async function getUserData() {
    let response = await $http.get({ route: "/users/self" });
    response = await response.json();
    data.user = { ...response.user };
}
async function getPublicationStatus() {
    let response = await $http.get({
        route: `/publish/items/${$route.params.identifier}/status`,
    });
    if (response.status === 200) {
        response = await response.json();
        data.status = response.status;
        data.form.visibility = response.visibility;
        data.form.emails = response?.emails?.join("\n");
        data.form.narrative = response.narrative;
        if (response.reviewDate) {
            data.form.reviewDate = parseISO(response.reviewDate);
        }
    }
}
async function getPermissionForms() {
    data.checkingPermissionFormsLoaded = true;
    let response = await $http.get({ route: `/items/${identifier.value}/permission-forms` });
    response = await response.json();

    for (let form of response.files) {
        if (form.name.match(/-rights-holder-permission\.pdf/))
            data.form.rightsHolderPermissionLoaded = true;
        if (form.name.match(/-language-authority-permission\.pdf/))
            data.form.languageAuthorityPermissionLoaded = true;
    }

    if (data.form.rightsHolderPermissionLoaded && data.form.languageAuthorityPermissionLoaded) {
        data.permissionsNotLoaded = false;
    } else {
        data.permissionsNotLoaded = true;
    }
    data.checkingPermissionFormsLoaded = false;
}
async function publish() {
    data.showNarrativeRequirement = false;
    data.publishLogs = [];
    if (
        data.form.visibility === "restricted" &&
        (!data.form.narrative || data.form.narrative.length === 0)
    ) {
        data.showNarrativeRequirement = true;
        return;
    }
    let emails;
    if (data.form.emails) {
        emails = data.form.emails.split("\n").map((line) => line.split(",").map((e) => e.trim()));
        emails = flattenDeep(emails);
        emails = emails.filter((e) => isEmail(e));
    }

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
    if (data.form.visibility === "restricted") {
        formData.access.narrative = data.form.narrative;
        formData.access.acl = emails;

        if (data.form.reviewDate) {
            formData.access.reviewDate = data.form.reviewDate?.toISOString();
        }
    }

    data.loading = true;
    await $http.post({
        route: `/publish/items/${$route.params.identifier}`,
        params: { clientId: $socket.id },
        body: { ...formData },
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    data.loading = false;
    getPublicationStatus();
}
</script>
