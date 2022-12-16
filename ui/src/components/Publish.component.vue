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
        <div class="" v-else v-loading="data.loading">
            <el-form :model="data.form" label-width="150px" @submit.prevent>
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
                <el-form-item label="Authorised Users" v-if="data.form.visibility === 'restricted'">
                    <el-input v-model="data.form.emails" :rows="8" type="textarea" />
                    <div class="text-gray-700">
                        List the email addresses of the people who are allowed to have access to
                        this item. One per line and/or separated by comma.
                    </div>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="publish"
                        >Publish this {{ props.type }}</el-button
                    >
                    <el-button @click="data.confirmed = false">Cancel</el-button>
                </el-form-item>
            </el-form>
        </div>
    </div>
</template>

<script setup>
import { reactive, watch, inject, onMounted } from "vue";
import { uniq, flattenDeep } from "lodash";
import { useRoute } from "vue-router";
import { isEmail } from "validator";
const $route = useRoute();
const $http = inject("$http");

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
    form: {
        orcid: "",
        visibility: "open",
        emails: "",
    },
    checked: [],
    confirmed: false,
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
    let response = await $http.get({
        route: `/publish/${$route.meta.type}/${$route.params.identifier}/status`,
    });
    if (response.status === 200) {
        response = await response.json();
        if (response?.status) {
            if (props.type === "item") {
                data.checked = ["agreed", "agreed", "agreed"];
                data.form.visibility = response.visibility;
                data.form.emails = response?.emails.join("\n");
            } else {
                data.checked = ["agreed", "agreed"];
                data.form.visibility = "open";
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
        ...data.form,
        emails,
    };

    data.loading = true;
    await $http.post({
        route: `/publish/${$route.meta.type}/${$route.params.identifier}`,
        body: { data: formData },
    });
    data.loading = false;
}
</script>
