<template>
    <div class="flex flex-col">
        <el-form
            class="flex flex-col px-2 md:flex-row md:justify-around md:items-end md:space-x-2"
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
                <template #label
                    ><div class="text-base md:text-lg">Filter by Language</div>
                </template>
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
                <template #label
                    ><div class="text-base md:text-lg">Manuscripts Containing</div>
                </template>
                <el-input
                    v-model="data.form.text"
                    size="large"
                    clearable
                    @blur="search"
                    @change="search"
                />
            </el-form-item>
            <el-form-item>
                <el-checkbox
                    v-model="data.form.is_phonetic"
                    size="large"
                    @blur="search"
                    @change="search">phonetic search</el-checkbox>
            </el-form-item>
            <el-form-item>
                <el-button @click="search" size="large">
                    <i class="fa-solid fa-magnifying-glass fa-xl"></i>
                </el-button>
            </el-form-item>
        </el-form>
        <div class="text-left m-auto md:m-0">
            {{ data.documentsTotal }} {{ pluralize("manuscript", data.documentsTotal) }}
            {{ pluralize("were", data.documentsTotal) }} found matching your search.
        </div>
        <el-checkbox
                    v-model="data.mapFilter"
                    size="large"
                    @blur="search"
                    @change="search">Search map area only</el-checkbox>
        <div class="flex flex-row items-start">
            <div>
                <MapboxMap
                    class="home-page-map-style m-auto"
                    :access-token="mapboxToken"
                    :map-style="mapboxStyle"
                    :bounds="bounds"
                    @mb-created="(mapboxInstance) => (map = mapboxInstance)"
                >
                    <div v-for="(feature, idx) of data.features" :key="feature.properties.path + idx">
                         <!-- TODO: Add zoom buttons -->
                        <MapboxMarker
                            :lng-lat="feature.geometry.coordinates"
                            :popup="{ ...popupOptions, data: feature.properties }"
                            @mb-open="showDescription"
                        >
                            <div slot:marker class="flex flex-col">
                                <!-- Layer a completely white pin underneath to fill in the otherwise-hollow dot -->
                                <div class="grid grid-cols-1 grid-rows-1">
                                    <i class="row-span-full col-span-full fa-solid fa-location-pin text-[white]" data-fa-transform="grow-15"></i>
                                    <i v-if="feature.properties.access[0].match(/open/i)" class="row-span-full col-span-full z-1 fa-solid fa-location-dot text-green-700" data-fa-transform="grow-15"></i>
                                    <i v-else class="row-span-full col-span-full z-1 fa-solid fa-location-pin-lock text-red-700" data-fa-transform="grow-15"></i>
                                </div>
                                <!-- shadow -->
                                <div class="mt-[-3px] ml-[-20%] w-4 h-4 opacity-50 blur-sm rounded-[50%] scale-x-100 scale-y-[0.2] bg-slate-900"></div>
                            </div>

                            <template v-slot:popup>
                                <div
                                    class="flex flex-col space-y-1 p-2 cursor-pointer"
                                    @click="loadItem(feature.properties)"
                                >
                                    <div class="text-base">
                                        {{ feature.properties.identifier[0] }}
                                    </div>
                                    <div class="text-lg font-medium">
                                        {{ feature.properties.name[0] }}
                                    </div>
                                    <div
                                        class="text-base italic"
                                        :class="{
                                            'text-green-700': feature.properties.access[0].match(/open/i),
                                            'text-red-700': !feature.properties.access[0].match(/open/i),
                                        }"
                                    >
                                        {{ feature.properties.access[0] }}
                                    </div>
                                </div>
                            </template>
                        </MapboxMarker>
                    </div>
                </MapboxMap>
                <div class="flex flex-col space-y-1 p-4 md:p-0">
                    <div>Legend:</div>
                    <div>
                        <i class="fa-solid fa-location-dot text-green-600"></i>&nbsp;The item is open access
                        subject to agreeing to the terms of use.
                    </div>
                    <div>
                        <i class="fa-solid fa-location-pin-lock text-red-700"></i>&nbsp;The item is restricted
                        access.
                    </div>
                    <div class="text-lg text-center font-bold">
                        Please note that locations are general and not precise points on the map.
                    </div>
                </div>
            </div>
            <div class="flex flex-col">
                <div v-if="data.showResultsList" v-for="(doc, idx) of data.documents" :key="doc._id + idx" style="display:block;border-bottom:gray 1px solid;padding:1em;cursor:pointer;" @click="loadItem({path: doc._id})">
                    <div class="text-base">
                        {{ doc.fields.identifier[0] }}
                    </div>
                    <div class="text-lg font-medium">
                        {{ doc.fields.name[0] }}
                    </div>
                    <div v-if="doc.highlight" v-for="(text, idx) of doc.highlight.text" class="text-sm font-medium">
                            …<span v-html="text"></span>…
                    </div>
                    <div v-if="doc.highlight" v-for="(text, idx) of doc.highlight.phoneticText" class="text-sm font-medium">
                            …<span v-html="text"></span>…
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted } from "vue";
import { ElAutocomplete, ElForm, ElFormItem, ElCheckbox, ElButton } from "element-plus";
import pluralize from "pluralize";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import flattenDeep from "lodash-es/flattenDeep.js";
import debounce from "lodash-es/debounce.js";
import turfCentroid from "@turf/centroid";
import { polygon } from "@turf/helpers";
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
const popupOptions = {
    maxWidth: "400px",
};

const data = reactive({
    form: {},
    mapFilter: false,
    showResultsList: false,
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
    data.form = {};
    data.showResultsList = false;
    search();
}

async function search() {
    const bounds = map.value.getBounds();
    let boundingBox;
    // TODO: replace with value from '[ ] map filter' checkbox
    if (data.mapFilter) {
        boundingBox = {
            topLeft: bounds.getNorthWest().wrap(),
            bottomRight: bounds.getSouthEast().wrap(),
        }
    }
    console.log()
    let response = await $http.post({
        route: "/repository/search",
        body: {
            ...data.form,
            boundingBox: boundingBox,
        },
    });
    // Don't show the search results list until the user has explicitly searched for something
    data.showResultsList = !isFormEmpty(data.form);
    if (response.status === 200) {
        response = await response.json();
        data.documents = response.hits;
        data.documentsTotal = response.hits.length;
        assembleFeatures();
    }
}

function isFormEmpty(form) {
    let nonEmptyFields = Object.entries(form).filter(([_k, v]) => {
        return v !== ""
    })

    return nonEmptyFields.length === 0;
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
            let centroid = false;
            if (geometry.type.match(/polygon/i)) {
                geometry = turfCentroid(polygon(geometry.coordinates)).geometry;
                centroid = true;
            }
            return {
                type: "Feature",
                properties: {
                    path: document._id,
                    identifier: document.fields.identifier,
                    name: document.fields.name,
                    description: document.fields.description,
                    access: document.fields.access,
                    centroid,
                },
                geometry,
            };
        });
    });
    features = flattenDeep(features);
    data.features = [...features];
}

function showDescription(event, data) {
    // console.log(event.target._content, data);
}

async function loadItem({ path }) {
    $router.push({ path: path });
}
</script>

<style>
.home-page-map-style {
    width: 100%;
    height: 750px;
}
.mapboxgl-popup-close-button {
    visibility: hidden;
}
.mapboxgl-popup-content {
    background-color: #f1f5f9;
}
em {
    background-color: yellow;
}
</style>
