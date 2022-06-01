<template>
    <div class="flex flex-col">
        <pre>{{ entity }}</pre>
        <div v-for="(value, property, idx) of props.entity" :key="idx">
            <div v-if="!['describoId'].includes(property)">
                <!-- render entity id -->
                <render-entity-id-component :entity="entity" v-if="property === '@id'" />

                <!-- render entity type -->
                <render-entity-type-component :entity="entity" v-else-if="property === '@type'" />

                <!-- render entity name -->
                <render-entity-name-component
                    :entity="entity"
                    v-else-if="property === 'name'"
                    @save:property="saveProperty"
                />

                <!-- <render-entity-property-component
                    :entity="entity"
                    :property="property"
                    :profile="profile"
                    v-else
                /> -->
            </div>
        </div>
    </div>
</template>

<script setup>
import RenderEntityIdComponent from "./RenderEntityId.component.vue";
import RenderEntityTypeComponent from "./RenderEntityType.component.vue";
import RenderEntityNameComponent from "./RenderEntityName.component.vue";
import RenderEntityPropertyComponent from "./RenderEntityProperty.component.vue";
const props = defineProps({
    crate: {
        type: Object,
        required: true,
    },
    entity: {
        type: Object,
        required: true,
    },
    profile: {
        type: Object,
        required: true,
    },
});
const emit = defineEmits(["save:property"]);

function saveProperty(data) {
    emit("save:property", { crate: props.crate, entity: props.entity, data });
}
</script>
