import { createImageThumbnail, createWebFormats } from "./image-processing.js";
import path from "path";
import { ensureDir, copy, remove, pathExists } from "fs-extra";
import Chance from "chance";
const chance = new Chance();

describe(`Test image manipulation capabilities`, () => {
    it(`Should be able to create a thumnbail from a tif image`, async () => {
        const identifier = chance.word();
        const directory = path.join("/tmp", identifier);
        const resource = `${identifier}-01.tiff`;

        await ensureDir(directory);
        await copy(
            path.join("src", "test-data", "image-processing", "test-image.tiff"),
            path.join(directory, resource)
        );

        await createImageThumbnail({ directory, resource });
        let target = path.join(directory, `${identifier}-01.thumbnail_h300.jpg`);
        expect(await pathExists(target)).toEqual(true);
        await remove(directory);
    });
    it(`Should be able to create a thumnbail from a jpg image`, async () => {
        const identifier = chance.word();
        const directory = path.join("/tmp", identifier);
        const resource = `${identifier}-01.jpg`;

        await ensureDir(directory);
        await copy(
            path.join("src", "test-data", "image-processing", "test-image.tiff"),
            path.join(directory, resource)
        );

        await createImageThumbnail({ directory, resource });
        let target = path.join(directory, `${identifier}-01.thumbnail_h300.jpg`);
        expect(await pathExists(target)).toEqual(true);
        await remove(directory);
    });
    it(`Should be able to create a jpg and a webp from a tif image`, async () => {
        const identifier = chance.word();
        const directory = path.join("/tmp", identifier);
        const resource = `${identifier}-01.tiff`;

        await ensureDir(directory);
        await copy(
            path.join("src", "test-data", "image-processing", "test-image.tiff"),
            path.join(directory, resource)
        );

        await createWebFormats({ directory, resource });
        let target = path.join(directory, `${identifier}-01.jpg`);
        expect(await pathExists(target)).toEqual(true);
        target = path.join(directory, `${identifier}-01.webp`);
        expect(await pathExists(target)).toEqual(true);

        await remove(directory);
    });
    it(`Should be able to create webp from a jpg image`, async () => {
        const identifier = chance.word();
        const directory = path.join("/tmp", identifier);
        const resource = `${identifier}-01.jpg`;

        await ensureDir(directory);
        await copy(
            path.join("src", "test-data", "image-processing", "test-image.tiff"),
            path.join(directory, resource)
        );

        await createWebFormats({ directory, resource });
        let target = path.join(directory, `${identifier}-01.webp`);
        expect(await pathExists(target)).toEqual(true);

        await remove(directory);
    });
});
