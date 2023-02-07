<template>
    <div class="flex flex-col">
        <div class="bg-blue-200 p-8 rounded text-center my-6">
            <div v-if="props.type === 'item'">
                When you publish, the item and all of its pages will be marked complete.
                <br />The item will then be flagged for review by an administrator prior to deposit
                into the repository.
            </div>
            <div v-if="props.type === 'collection'">
                When you publish, the collection will be flagged for review by an administrator
                prior to ingestion into the repository.
            </div>
        </div>
        <div class="flex flex-col" v-if="!data.confirmed">
            <el-checkbox
                v-model="data.checked[0]"
                label="Have you written the metadata; paying particular attention to providing all of
                    the required fields?"
                true-label="agreed"
            />
            <el-checkbox
                v-model="data.checked[1]"
                label="Have you uploaded all of the required permission forms?"
                true-label="agreed"
            />
            <el-checkbox
                v-if="props.type === 'item'"
                v-model="data.checked[2]"
                label="Have you reviewed the transcription for each page and marked the page as
                    complete?"
                true-label="agreed"
            />
        </div>
        <div
            v-else
            v-loading="data.loading"
            class="flex flex-col"
            :class="{ 'h-40': data.loading }"
        >
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
                <el-form-item label="Visibility" v-if="props.type === 'item'">
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
                    <el-button type="primary" @click="publish">
                        Publish this {{ props.type }}
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
import StatusBadgeComponent from "./StatusBadge.component.vue";
import { reactive, watch, inject, onMounted } from "vue";
import { uniq, flattenDeep } from "lodash";
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

const props = defineProps({
    type: {
        type: String,
        required: true,
        validate: (val) => ["item", "collection"].includes(val),
    },
});
const data = reactive({
    loading: false,
    user: {},
    status: undefined,
    showNarrativeRequirement: false,
    form: {
        orcid: "",
        visibility: "open",
        emails: "",
        narrative: undefined,
        reviewDate: undefined,
    },
    checked: [],
    confirmed: false,
    publishLogs: [],
});

watch(
    () => data.checked,
    () => validate(),
    { deep: true }
);
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
    let routePath = $route.meta.type === "item" ? "items" : "collections";

    let response = await $http.get({
        route: `/publish/${routePath}/${$route.params.identifier}/status`,
    });
    if (response.status === 200) {
        response = await response.json();
        if (response?.status) {
            if (props.type === "item") {
                data.status = response.status;
                data.form.visibility = response.visibility;
                data.form.emails = response?.emails?.join("\n");
                if (data.status !== "inProgress") {
                    data.checked = ["agreed", "agreed", "agreed"];
                }
                data.form.narrative = response.narrative;
                if (response.reviewDate) {
                    data.form.reviewDate = parseISO(response.reviewDate);
                }
            } else if (props.type === "collection") {
                data.status = response.status;
                data.form.visibility = "open";
                if (data.status !== "inProgress") {
                    data.checked = ["agreed", "agreed"];
                }
            }
        }
    }
}
function validate() {
    const checkLength = props.type === "item" ? 3 : 2;
    if (
        data.checked.length === checkLength &&
        uniq(data.checked).length === 1 &&
        uniq(data.checked)[0] === "agreed"
    ) {
        data.confirmed = true;
    } else {
        data.confirmed = false;
    }
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
    let routePath = $route.meta.type === "item" ? "items" : "collections";
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
        route: `/publish/${routePath}/${$route.params.identifier}`,
        params: { clientId: $socket.id },
        body: { ...formData },
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    data.loading = false;
    getPublicationStatus();
}
</script>
