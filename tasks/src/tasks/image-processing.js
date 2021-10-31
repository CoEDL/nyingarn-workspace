import sharp from "sharp";
import path from "path";

export async function createImageThumbnail({ directory, files }) {
    for (let file of files) {
        let source = path.join(directory, file.source);
        let dirname = path.dirname(file.source);
        let target = path.join(directory, dirname, file.target);
        await sharp(source).resize({ height: file.height }).toFile(target);
    }
}

// import sharp from "sharp";
// import { readdir, pathExists } from "fs-extra";
// import { loadConfiguration } from "../../common";
// import path from "path";

// export async function createImageWebFormats({ collection, album }) {
//     let configuration = await loadConfiguration();
//     let folder = path.join(configuration.api.collections, collection, album);
//     for (let image of await readdir(folder)) {
//         // image = path.join(folder, image);
//         if (image.match(/^.*\.tiff/)) {
//             image = {
//                 folder,
//                 extension: path.extname(image),
//                 basename: path.basename(image, path.extname(image)),
//                 path: folder,
//                 tiff: image,
//             };
//             image.jpg = `${image.basename}.jpg`;
//             image.avif = `${image.basename}.avif`;
//             image.webp = `${image.basename}.webp`;

//             let src = path.join(folder, image.tiff);
//             let sharpImage = await sharp(src);
//             for (let format of ["jpg", "avif", "webp"]) {
//                 try {
//                     let tgt = path.join(folder, image[format]);
//                     let exists = await pathExists(tgt);
//                     if (!exists) {
//                         sharpImage.toFile(tgt);
//                         console.log(`Creating ${format} for: ${image.tiff}`);
//                     }
//                 } catch (error) {
//                     console.log(`Error creating ${format}: ${image.tiff}: ${error.message}`);
//                 }
//             }
//         }
//     }
// }

// import sharp from "sharp";
// import { readdir, pathExists, writeJson } from "fs-extra";
// import { loadConfiguration } from "../common";
// import path from "path";

// export async function createImageMetadata({ collection, album }) {
//     let configuration = await loadConfiguration();
//     let folder = path.join(configuration.api.collections, collection, album);
//     for (let image of await readdir(folder)) {
//         // image = path.join(folder, image);
//         if (image.match(/^.*\.tiff/)) {
//             image = {
//                 folder,
//                 extension: path.extname(image),
//                 basename: path.basename(image, path.extname(image)),
//                 path: folder,
//             };

//             image.tiff = `${image.basename}.tiff`;
//             image.thumbnail = `${image.basename}_thumb.jpg`;
//             image.jpeg = `${image.basename}.jpg`;
//             image.avif = `${image.basename}.avif`;
//             image.webp = `${image.basename}.webp`;
//             image.metadata = `${image.basename}.json`;

//             let context = ["https://w3id.org/ro/crate/1.1/context"];
//             let graph = [
//                 {
//                     "@id": "ro-crate-metadata.json",
//                     "@type": "CreativeWork",
//                     conformsTo: {
//                         "@id": "https://w3id.org/ro/crate/1.1/context",
//                     },
//                     about: {
//                         "@id": "./",
//                     },
//                 },
//                 {
//                     "@id": "./",
//                     "@type": "Dataset, RepositoryObject",
//                     hasPart: [
//                         { "@id": image.tiff },
//                         { "@id": image.thumbnail },
//                         { "@id": image.jpg },
//                         { "@id": image.avif },
//                         { "@id": image.webp },
//                     ],
//                 },
//             ];
//             for (let format of ["tiff", "jpeg", "avif", "webp"]) {
//                 let sharpImage = await sharp(path.join(image.path, image[format])).metadata();
//                 graph.push({
//                     "@id": image[format],
//                     "@type": ["File", "ImageObject"],
//                     name: image[format],
//                     height: sharpImage.height,
//                     width: sharpImage.width,
//                     encodingFormat: `image/${format}`,
//                 });
//             }
//             let sharpImage = await sharp(path.join(image.path, image.thumbnail)).metadata();
//             graph.push({
//                 "@id": image.thumbnail,
//                 "@type": ["File", "ImageObject"],
//                 name: image.thumbnail,
//                 height: sharpImage.height,
//                 width: sharpImage.width,
//                 encodingFormat: `image/jpeg`,
//             });

//             // console.log(JSON.stringify(graph, null, 2));
//             let crateFile = path.join(folder, image.metadata);
//             if (!(await pathExists(crateFile))) {
//                 console.log(`Creating metadata for: ${image.tiff}`);
//                 await writeJson(crateFile, {
//                     "@context": context,
//                     "@graph": graph,
//                 });
//             }
//         }
//     }
// }
