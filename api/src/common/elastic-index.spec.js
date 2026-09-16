require("regenerator-runtime");
import { ROCrate } from "ro-crate";
import { createDefaultROCrateFile } from "../lib/crate-tools.js";
import { extractGeography } from "./elastic-index.js";

function crateWith(...entities) {
    let crate = createDefaultROCrateFile({ name: "an item" });
    crate["@graph"] = [...crate["@graph"], ...entities];
    return new ROCrate(crate, { array: true, link: true });
}

function place(geojson) {
    return { "@id": "#place", "@type": "GeoCoordinates", name: "somewhere", geojson };
}

const feature = (geometry) => JSON.stringify({ type: "Feature", geometry });

describe("geography extraction", () => {
    it("returns nothing for an item with no geography", () => {
        expect(extractGeography({ crate: crateWith() })).toEqual([]);
    });
    it("extracts the geometry of a point", () => {
        const crate = crateWith(
            place(feature({ type: "Point", coordinates: ["145.26", "-36.09"] }))
        );
        expect(extractGeography({ crate })).toEqual([
            { type: "Point", coordinates: [145.26, -36.09] },
        ]);
    });
    it("closes an unclosed polygon ring and leaves a closed one alone", () => {
        const ring = [[1, 1], [2, 1], [2, 2]];
        const closed = [...ring, [1, 1]];

        const open = crateWith(place(feature({ type: "Polygon", coordinates: [ring] })));
        expect(extractGeography({ crate: open })).toEqual([
            { type: "Polygon", coordinates: [closed] },
        ]);

        const alreadyClosed = crateWith(place(feature({ type: "Polygon", coordinates: [closed] })));
        expect(extractGeography({ crate: alreadyClosed })).toEqual([
            { type: "Polygon", coordinates: [closed] },
        ]);
    });
    it("closes every ring of a multipolygon", () => {
        const crate = crateWith(
            place(
                feature({
                    type: "MultiPolygon",
                    coordinates: [[[[1, 1], [2, 1], [2, 2]]], [[[5, 5], [6, 5], [6, 6]]]],
                })
            )
        );
        expect(extractGeography({ crate })).toEqual([
            {
                type: "MultiPolygon",
                coordinates: [
                    [[[1, 1], [2, 1], [2, 2], [1, 1]]],
                    [[[5, 5], [6, 5], [6, 6], [5, 5]]],
                ],
            },
        ]);
    });
    it("skips a geo entity with no geojson rather than throwing", () => {
        expect(extractGeography({ crate: crateWith(place(undefined)) })).toEqual([]);
    });
    it("skips unparseable geojson rather than throwing", () => {
        expect(extractGeography({ crate: crateWith(place("not json")) })).toEqual([]);
    });
    it("handles a feature collection", () => {
        const crate = crateWith(
            place(
                JSON.stringify({
                    type: "FeatureCollection",
                    features: [
                        { type: "Feature", geometry: { type: "Point", coordinates: [1, 2] } },
                        { type: "Feature", geometry: { type: "Point", coordinates: [3, 4] } },
                    ],
                })
            )
        );
        expect(extractGeography({ crate })).toEqual([
            { type: "Point", coordinates: [1, 2] },
            { type: "Point", coordinates: [3, 4] },
        ]);
    });
});
