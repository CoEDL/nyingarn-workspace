import lodashPkg from "lodash";
const { groupBy, orderBy, flattenDeep, compact } = lodashPkg;
import path from "path";

export class Textract {
    constructor({ identifier, resource, document }) {
        this.document = document;
        this.surface = `<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="${identifier}-${resource}">`;
        this.minConfidence = 70;
        this.words = this.document.Blocks.filter((b) => b.BlockType === "WORD");
        this.wordsGroupedById = groupBy(this.words, "Id");
    }

    parseSimpleDocument() {
        let text = [];
        let lines = this.document.Blocks.filter((b) => b.BlockType === "LINE").map((line) => {
            line = line.Relationships.map((r) => {
                return r.Ids.map((id) => {
                    if (this.wordsGroupedById[id][0].Confidence > this.minConfidence) {
                        return this.escape(this.wordsGroupedById[id][0].Text);
                    } else {
                        return `<unclear>${this.escape(
                            this.wordsGroupedById[id][0].Text
                        )}</unclear>`;
                    }
                });
            });
            line = flattenDeep(line);
            text.push(`<line>${line.join(" ")}</line>`);
        });

        return [this.surface, ...text, "</surface>"];
    }

    parseTables() {
        let wordInTable = [];

        const blocksGroupedById = groupBy(this.document.Blocks, "Id");

        // for each table
        let tables = this.document.Blocks.filter((b) => b.BlockType === "TABLE").map((table) => {
            let cells = table.Relationships.filter((type) => type.Type === "CHILD")[0].Ids.map(
                (id) => blocksGroupedById[id][0]
            );

            let rows = groupBy(cells, "RowIndex");
            let t = ["<table>"];
            for (let row of Object.keys(rows)) {
                row = orderBy(rows[row], "ColumnIndex");

                let cells = row.map((cell) => {
                    cell = cell?.Relationships?.map((r) => {
                        return r.Ids.map((id) => {
                            wordInTable.push(id);
                            if (this.wordsGroupedById[id][0].Confidence > this.minConfidence) {
                                return this.escape(this.wordsGroupedById[id][0].Text);
                            } else {
                                return `<unclear>${this.escape(
                                    this.wordsGroupedById[id][0].Text
                                )}</unclear>`;
                            }
                        });
                    });
                    cell = flattenDeep(cell).join(" ");
                    return `<cell>${cell}</cell>`;
                });
                t.push(`<row>`);
                t.push(`${cells.join("")}`);
                t.push(`</row>`);
            }
            t.push("</table>");
            return t;
        });

        // extract the non tabular content
        let text = [];
        this.document.Blocks.filter((b) => b.BlockType === "LINE").forEach((line) => {
            line = line.Relationships.map((r) => {
                return r.Ids.map((id) => {
                    if (!wordInTable.includes(id)) {
                        if (this.wordsGroupedById[id][0].Confidence > this.minConfidence) {
                            return this.escape(this.wordsGroupedById[id][0].Text);
                        } else {
                            return `<unclear>${this.escape(
                                this.wordsGroupedById[id][0].Text
                            )}</unclear>`;
                        }
                    }
                });
            });
            line = flattenDeep(line);
            line = compact(line);
            if (line.length) {
                text.push(`<line>${line.join(" ")}</line>`);
            }
        });

        return [this.surface, ...text, ...flattenDeep(tables), "</surface>"];
    }

    escape(text) {
        text = text.replace(/&/g, "&amp;");
        text = text.replace(/</g, "&lt;");
        text = text.replace(/>/g, "&gt;");
        return text;
    }
}
