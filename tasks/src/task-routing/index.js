import { setupHandlers as setupImageProcessingHandlers } from "./image-processing";

export function setupHandlers({ rabbit }) {
    setupImageProcessingHandlers({ rabbit });
}
