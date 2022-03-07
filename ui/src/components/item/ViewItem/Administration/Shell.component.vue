<template>
    <div class="flex flex-col">
        <invite-user-component />
        <reprocess-transcriptions-imports />
    </div>
</template>

<script>
import InviteUserComponent from "./InviteUser.component.vue";
import ReprocessTranscriptionsImports from "./ReprocessTranscriptionsImports.component.vue";
export default {
    components: {
        InviteUserComponent,
        ReprocessTranscriptionsImports,
    },
    data() {
        return {};
    },
    methods: {},
};
</script>
