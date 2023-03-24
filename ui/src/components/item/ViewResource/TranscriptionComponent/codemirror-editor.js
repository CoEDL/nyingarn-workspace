import { undo as codemirrorUndo, redo as codemirrorRedo } from "@codemirror/commands";
import format from "xml-formatter";
import { compact } from "lodash";
import { $http } from "../../../../routes.js";

export class CodemirrorEditorControls {
    constructor({ view }) {
        this.view = view;
    }

    undo() {
        codemirrorUndo({
            state: this.view.state,
            dispatch: this.view.dispatch,
        });
    }
    redo() {
        codemirrorRedo({
            state: this.view.state,
            dispatch: this.view.dispatch,
        });
    }
    delete() {
        let document = this.view.state.doc.toString();
        let lines = document.split("\n").map((line) => {
            if (line.match(/surface/)) return line;
        });
        lines = compact(lines);
        let changes = {
            from: 0,
            to: this.view.state.doc.length,
            insert: lines.join("\n"),
        };
        this.dispatch({ changes });
    }
    convertToTei({ $route }) {
        let document = this.view.state.doc.toString().split("\n");
        if (document[0].match(/^\<surface xmlns=/)) return;
        const tei = [
            `<surface xmlns="http://www.tei-c.org/ns/1.0" xml:id="${$route.params.resource}">`,
            ...document.map((l) => `<line>${l}</line>`),
            "</surface>",
        ];
        formatDocument({ view: this.view, document: tei.join("\n") });
    }
    add({ element, pre, post }) {
        this.applyMarkup({ element, pre, post });
    }
    applyMarkup({ element = undefined, pre = undefined, post = undefined }) {
        let selections = this.view.state.selection.ranges;

        let changes = selections.map((r) => {
            let insert;
            if (element) {
                insert = `<${element}>${this.view.state.sliceDoc(r.from, r.to)}</${element}>`;
            } else if (pre && !post) {
                insert = `${pre}${this.view.state.sliceDoc(r.from, r.to)}`;
            } else if (pre && post) {
                insert = `${pre}${this.view.state.sliceDoc(r.from, r.to)}${post}`;
            }
            let change = {
                from: r.from,
                to: r.to,
                insert,
            };
            return change;
        });
        this.dispatch({ changes });
    }
    remove({ element, pre, post }) {
        this.removeMarkup({ element, pre, post });
    }
    removeMarkup({ element = undefined, pre = undefined, post = undefined }) {
        let selections = this.view.state.selection.ranges;
        let changes = selections.map((r) => {
            let content = this.view.state.sliceDoc(r.from, r.to);
            const elementPreRe = new RegExp(`<${element}>`, "gi");
            const elementPostRe = new RegExp(`</${element}>`, "gi");
            const preRe = new RegExp(pre, "gi");
            const postRe = new RegExp(post, "gi");
            if (element) {
                content = content.replace(elementPreRe, "").replace(elementPostRe, "");
            } else {
                content = content.replace(preRe, "").replace(postRe, "");
            }

            let change = {
                from: r.from,
                to: r.to,
                insert: content,
            };
            return change;
        });
        this.dispatch({ changes });
    }
    removeAllMarkup() {
        let changes;
        let selections = this.view.state.selection.ranges;
        if (selections.length === 1 && selections[0].from === selections[0].to) {
            let document = this.view.state.doc.toString();
            const lines = document.split("\n").map((line) => {
                if (line.match(/surface/)) return line;
                line = line
                    .replace(/<.*?>/g, "")
                    .replace(/<\/.*?>/g, "")
                    .trim();
                if (line) return line;
            });
            changes = {
                from: 0,
                to: this.view.state.doc.length,
                insert: compact(lines).join("\n"),
            };
        } else {
            changes = selections.map((r) => {
                let line = this.view.state
                    .sliceDoc(r.from, r.to)
                    .split("\n")
                    .map((line) => {
                        if (line.match(/surface/)) return line;
                        line = line
                            .replace(/<.*?>/g, "")
                            .replace(/<\/.*?>/g, "")
                            .trim();
                        if (line) return line;
                    });
                line = compact(line).join("\n");
                if (line.length) {
                    return {
                        from: r.from,
                        to: r.to,
                        insert: line,
                    };
                }
            });
            changes = compact(changes);
        }
        this.dispatch({ changes });
    }
    dispatch({ changes }) {
        this.view.dispatch({ changes });
    }
}

export function formatDocument({ view, document = undefined }) {
    document = document ? document : view.state.doc.toString();

    // see if the document is well formed or not
    const parser = new DOMParser();
    const doc = parser.parseFromString(document, "application/xml");
    const errorNode = doc.querySelector("parsererror");
    if (errorNode?.textContent) {
        let textContent = errorNode.textContent.split("\n");
        return { error: [textContent[0], textContent[2]].join(" ") };
    }

    let documentLength = view.state.doc.length;
    document = format(document, {
        indentation: "  ",
        collapseContent: true,
    });
    let changes = {
        from: 0,
        to: documentLength,
        insert: document,
    };
    view.dispatch({ changes });
    return {};
}

export async function transformDocument({ identifier, resource }) {
    let response = await $http.get({
        route: `/items/${identifier}/resources/${resource}/transform`,
    });
    if (response.status !== 200) {
    }
    let { document, error } = await response.json();
    return { document, error };
}
