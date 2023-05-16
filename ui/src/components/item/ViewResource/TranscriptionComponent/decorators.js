import { MatchDecorator, ViewPlugin, Decoration } from "@codemirror/view";

const unclearDecorator = new MatchDecorator({
    regexp: /\bunclear\b/g,
    decoration: Decoration.mark({ attributes: { style: "color: red" } }),
});

export const unclearHighlight = ViewPlugin.fromClass(
    class {
        constructor(view) {
            this.decorations = unclearDecorator.createDeco(view);
        }
        update(update) {
            this.decorations = unclearDecorator.updateDeco(update, this.decorations);
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);
