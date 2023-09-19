<template>
    <div class="flex flex-col">
        <div class="p-2">
            <el-form
                class="flex flex-row justify-around items-end space-x-2"
                label-position="top"
                :model="data.form"
                @submit.prevent
            >
                <el-form-item label="" class="flex-grow">
                    <template #label><div class="text-lg">Filter by Language</div> </template>
                    <!-- <el-input v-model="data.form.language" size="large" /> -->
                    <el-autocomplete
                        class="w-full"
                        size="large"
                        :trigger-on-focus="false"
                        v-model="data.query"
                        :fetch-suggestions="lookup"
                        clearable
                    >
                    </el-autocomplete>
                </el-form-item>

                <el-form-item label="" class="flex-grow">
                    <template #label><div class="text-lg">Manuscripts Containing</div> </template>
                    <el-input v-model="data.form.text" size="large" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button @click="search" size="large">
                        <i class="fa-solid fa-magnifying-glass fa-xl"></i>
                    </el-button>
                </el-form-item>
            </el-form>
        </div>
        <div class="text-left">
            {{ data.documentsTotal }} {{ pluralize("manuscript", data.documentsTotal) }}
            {{ pluralize("were", data.documentsTotal) }} found matching your search.
        </div>
        <div id="map" class="home-page-map-style"></div>
    </div>
</template>

<script setup>
import { ElAutocomplete } from "element-plus";
import "leaflet/dist/leaflet.css";
import * as Leaflet from "leaflet/dist/leaflet-src.esm.js";
import { reactive, inject, onMounted } from "vue";
import pluralize from "pluralize";
import { useRouter } from "vue-router";
import flattenDeep from "lodash-es/flattenDeep.js";
import debounce from "lodash-es/debounce.js";
const $http = inject("$http");
const $router = useRouter();

const data = reactive({
    form: {},
    map: undefined,
    query: "",
    documents: [],
    documentsTotal: 0,
    contentLanguages: [],
    subjectLanguages: [],
    debouncedSearch: debounce(search, 400),
});

onMounted(() => {
    init();
});

async function init() {
    data.map = new Leaflet.map("map");

    // we need to give leaflet and vue and the dom a couple seconds before barreling on
    await new Promise((resolve) => setTimeout(resolve, 200));
    data.map.fitBounds([
        [-8.357896965231912, 107.90038704872133],
        [-46.28217559951351, 159.75585579872134],
    ]);
    // centerMap();
    Leaflet.tileLayer("https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}", {
        attribution:
            'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 2,
        maxZoom: 16,
        ext: "jpg",
        noWrap: true,
    }).addTo(data.map);
    data.map.setZoom(4);

    await search();

    data.map.on("zoomend", (e) => data.debouncedSearch());
    data.map.on("moveend", (e) => data.debouncedSearch());
}
async function search() {
    const bounds = data.map.getBounds();
    let response = await $http.post({
        route: "/repository/search",
        body: {
            ...data.form,
            language: data.query,
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
        //     cb(response.hits);
        removeExistingLayers();
        drawSearchResults();
        // indexContent({ documents: response.hits });
    }
}

async function lookup(query, cb) {
    let response = await $http.get({ route: "/repository/lookup/language", params: { query } });
    if (response.status === 200) {
        response = await response.json();
        cb(response.matches.map((m) => ({ value: m })));
    }
}

function removeExistingLayers() {
    data.map.eachLayer((layer) => {
        if (!layer?._url?.match(/stamen-tiles/)) {
            data.map.removeLayer(layer);
        }
    });
}

function drawSearchResults() {
    let features = data.documents.map((document) => {
        return document.fields.location.map((geometry) => {
            return { type: "Feature", geometry };
        });
    });
    features = flattenDeep(features);

    let fg = Leaflet.featureGroup(
        features.map((feature) => {
            return Leaflet.geoJSON(feature, {
                pointToLayer: function (feature, latlng) {
                    return Leaflet.marker(latlng);
                },
            });
        })
    );
    fg.addTo(data.map);
}

async function loadItem(item) {
    $router.push({ path: item._id });
}
</script>

<style>
.home-page-map-style {
    width: 950px;
    height: 750px;
}
.leaflet-container {
    border: 1px solid black;
    background-color: #f1f5f9;
    outline: 0;
}
</style>
