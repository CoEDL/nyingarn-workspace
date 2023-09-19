<template>
    <div class="flex flex-col">
        <el-form
            class="flex flex-row justify-around items-end space-x-2"
            label-position="top"
            :model="data.form"
            @submit.prevent
        >
            <el-form-item>
                <el-button @click="reset" size="large">
                    <i class="fa-solid fa-refresh fa-xl"></i>
                </el-button>
            </el-form-item>
            <el-form-item label="" class="flex-grow">
                <template #label><div class="text-lg">Filter by Language</div> </template>
                <!-- <el-input v-model="data.form.language" size="large" /> -->
                <el-autocomplete
                    class="w-full"
                    size="large"
                    :trigger-on-focus="false"
                    v-model="data.form.language"
                    :fetch-suggestions="lookup"
                    @select="search"
                    @change="search"
                    clearable
                >
                </el-autocomplete>
            </el-form-item>

            <el-form-item label="" class="flex-grow">
                <template #label><div class="text-lg">Manuscripts Containing</div> </template>
                <el-input
                    v-model="data.form.text"
                    size="large"
                    clearable
                    @blur="search"
                    @change="search"
                />
            </el-form-item>
            <el-form-item>
                <el-button @click="search" size="large">
                    <i class="fa-solid fa-magnifying-glass fa-xl"></i>
                </el-button>
            </el-form-item>
        </el-form>
        <div class="text-left">
            {{ data.documentsTotal }} {{ pluralize("manuscript", data.documentsTotal) }}
            {{ pluralize("were", data.documentsTotal) }} found matching your search.
        </div>
        <MapboxMap
            class="home-page-map-style"
            :access-token="mapboxToken"
            :map-style="mapboxStyle"
            :bounds="bounds"
            @mb-created="(mapboxInstance) => (map = mapboxInstance)"
        >
            <div v-for="feature of data.features">
                <MapboxMarker
                    :lng-lat="feature.geometry.coordinates"
                    popupspace
                    :color="feature.properties.access[0].match(/open/i) ? 'green' : 'red'"
                >
                    <template v-slot:popup>
                        <div
                            class="flex flex-col p-1 cursor-pointer hover:underline"
                            @click="loadItem(feature.properties)"
                        >
                            <div class="text-lg">
                                {{ feature.properties.identifier[0] }}
                            </div>
                            <div class="text-base">
                                {{ feature.properties.name[0] }}
                            </div>
                        </div>
                    </template>
                </MapboxMarker>
            </div>
        </MapboxMap>
    </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted } from "vue";
import { ElAutocomplete, ElForm, ElFormItem, ElButton } from "element-plus";
import pluralize from "pluralize";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import flattenDeep from "lodash-es/flattenDeep.js";
import debounce from "lodash-es/debounce.js";
const $http = inject("$http");
const $store = useStore();
const $router = useRouter();

const mapboxToken = $store.state.configuration.ui.mapboxToken;
const mapboxStyle = "mapbox://styles/mapbox/outdoors-v12";
import { MapboxMap, MapboxMarker } from "@studiometa/vue-mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
const map = ref();
const bounds = [
    [107.9, -8.35],
    [159.75, -46.28],
];

const data = reactive({
    form: {},
    documents: [],
    documentsTotal: 0,
    debouncedSearch: debounce(search, 400),
});

onMounted(() => {
    init();
    map.value.on("moveend", () => data.debouncedSearch());
    map.value.on("zoomend", () => data.debouncedSearch());
});

async function init() {
    search();
}

function reset() {
    map.value.fitBounds(bounds);
    data.form = {};
    search();
}

async function search() {
    const bounds = map.value.getBounds();
    let response = await $http.post({
        route: "/repository/search",
        body: {
            ...data.form,
            boundingBox: {
                topLeft: bounds.getNorthWest().wrap(),
                bottomRight: bounds.getSouthEast().wrap(),
            },
        },
    });
    if (response.status === 200) {
        response = await response.json();
        data.documents = response.hits;
        data.documentsTotal = response.hits.length;
        assembleFeatures();
    }
}

async function lookup(query, cb) {
    let response = await $http.get({ route: "/repository/lookup/language", params: { query } });
    if (response.status === 200) {
        response = await response.json();
        cb(response.matches.map((m) => ({ value: m })));
    }
}

function assembleFeatures() {
    let features = data.documents.map((document) => {
        return document.fields.location.map((geometry) => {
            return {
                type: "Feature",
                properties: {
                    path: document._id,
                    identifier: document.fields.identifier,
                    name: document.fields.name,
                    description: document.fields.description,
                    access: document.fields.access,
                },
                geometry,
            };
        });
    });
    features = flattenDeep(features);
    data.features = [...features];
}

async function loadItem(item) {
    $router.push({ path: item.path });
}
</script>

<style>
.home-page-map-style {
    width: 950px;
    height: 750px;
}
.mapboxgl-popup-close-button {
    visibility: hidden;
}
.mapboxgl-popup-content {
    background-color: #f1f5f9;
}
</style>
