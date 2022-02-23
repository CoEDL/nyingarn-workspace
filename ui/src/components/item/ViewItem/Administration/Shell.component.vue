<template>
    <div class="flex flex-col">
        <view-item-users-component class="mb-6 p-4 bg-gray-200" />
        <invite-user-component class="mb-6 p-4 bg-gray-200" />
    </div>
</template>

<script>
import InviteUserComponent from "./InviteUser.component.vue";
import ViewItemUsersComponent from "./ViewItemUsers.component.vue";
export default {
    components: {
        InviteUserComponent,
        ViewItemUsersComponent,
    },
    data() {
        return {};
    },
    methods: {},
};
</script>
