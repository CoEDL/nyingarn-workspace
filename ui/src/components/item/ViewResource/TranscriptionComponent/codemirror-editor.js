import { undo as codemirrorUndo, redo as codemirrorRedo } from "@codemirror/commands";
import format from "xml-formatter";
import { compact } from "lodash";

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
        let changes = {
            from: 0,
            to: this.view.state.doc.length,
            insert: "",
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
        let changes = {
            from: 0,
            to: this.view.state.doc.length,
            insert: tei.join("\n"),
        };
        this.dispatch({ changes });
    }
    formatDocument({ document }) {
        document = document ? document : this.view.state.doc.toString();
        try {
            let formattedDocument = format(document, {
                indentation: "  ",
                collapseContent: true,
            });
            let changes = {
                from: 0,
                to: this.view.state.doc.length,
                insert: formattedDocument,
            };
            this.dispatch({ changes });
        } catch (error) {
            // couldn't format - likely not an XML document
        }
    }
    add({ element, pre, post }) {
        this.applyMarkup({ element, pre, post });
    }
    applyMarkup({ element = undefined, pre = undefined, post = undefined }) {
        let selections = this.view.state.selection.ranges.reverse();
        let changes = selections.map((r) => {
            let change = {
                from: r.from,
                to: r.to,
                insert: element
                    ? `<${element}>${this.view.state.sliceDoc(r.from, r.to)}</${element}>`
                    : `${pre}${this.view.state.sliceDoc(r.from, r.to)}${post}`,
            };
            return change;
        });
        this.dispatch({ changes });
    }
    remove({ element, pre, post }) {
        this.removeMarkup({ element, pre, post });
    }
    removeMarkup({ element = undefined, pre = undefined, post = undefined }) {
        let selections = this.view.state.selection.ranges.reverse();
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
        console.log(selections);
        if (selections.length === 1 && selections[0].from === selections[0].to) {
            let document = this.view.state.doc.toString();
            const lines = document.split("\n").map((line) => {
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
                    .map((l) => {
                        l = l
                            .replace(/<.*?>/g, "")
                            .replace(/<\/.*?>/g, "")
                            .trim();
                        if (l) return l;
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
