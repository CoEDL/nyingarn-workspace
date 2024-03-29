<template>
    <div :id="mapId" style="height: 200px"></div>
</template>

<script setup>
import "leaflet/dist/leaflet.css";
import * as Leaflet from "leaflet/dist/leaflet-src.esm.js";
import { reactive, onMounted, onBeforeUnmount } from "vue";

const props = defineProps({
    entity: { type: Object },
});

const data = reactive({
    map: undefined,
    properties: {},
    layers: [],
});

onMounted(() => {
    init();
});
onBeforeUnmount(() => {
    data.map.off();
    data.map.remove();
});
const mapId = props.entity["@id"];

async function init() {
    if (!props.entity.geo?.geojson) return;

    data.map = new Leaflet.map(mapId, { scrollWheelZoom: false });

    // we need to give leaflet and vue and the dom a couple seconds before barreling on
    await new Promise((resolve) => setTimeout(resolve, 200));
    centerMap();
    Leaflet.tileLayer("https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.{ext}", {
        attribution:
            'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: "abcd",
        minZoom: 1,
        maxZoom: 16,
        ext: "jpg",
        noWrap: true,
    }).addTo(data.map);

    let geojson = JSON.parse(props.entity.geo.geojson);
    removeExistingLayers();

    // we need to give leaflet and vue and the dom a couple seconds before barreling on
    await new Promise((resolve) => setTimeout(resolve, 200));
    addFeatureGroup({ geoJSON: geojson });
}

function centerMap() {
    data.map.setView([0, 0], 0);
}

function removeExistingLayers() {
    data.layers.forEach((layer) => data.map.removeLayer(layer));
}

function addFeatureGroup({ geoJSON, type }) {
    try {
        let fg = Leaflet.featureGroup([
            Leaflet.geoJSON(geoJSON, {
                pointToLayer: function (feature, latlng) {
                    return Leaflet.circleMarker(latlng);
                },
            }),
        ]);
        fg.setStyle({ color: "#000000" });
        fg.addTo(data.map);
        data.layers.push(fg);

        setTimeout(() => {
            data.map.flyToBounds(fg.getBounds(), { maxZoom: 3, duration: 2 });
        }, 1500);
        return fg;
    } catch (error) {
        console.log(error);
    }
}
</script>

<style>
.leaflet-control-attribution {
    font-size: 8px;
}

.leaflet-control-attribution > a {
    font-size: 8px;
}
</style>
