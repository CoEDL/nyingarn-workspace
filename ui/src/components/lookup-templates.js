// export class Lookup {
//     constructor({ templates }) {
//         this.templates = templates;
//     }
//     entityTemplates({ type, filter, limit = 5 }) {
//         let templates = this.templates
//             .filter((template) => template.entity)
//             .filter((template) => {
//                 if (type && !filter) {
//                     return template.entity["@type"] === type;
//                 } else if (type && filter) {
//                     return (
//                         template.entity["@type"] === type &&
//                         (template.entity["@id"].match(filter) || template.entity.name.match(filter))
//                     );
//                 } else {
//                     return template;
//                 }
//             });
//         return templates.slice(0, limit);
//     }
//     crateTemplates() {
//         return this.templates.filter((template) => template.crate);
//     }
// }
