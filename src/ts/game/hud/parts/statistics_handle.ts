import { makeOffscreenBuffer } from "../../../core/buffer_utils";
import { globalConfig } from "../../../core/config";
import { clamp, formatBigNumber, round2Digits } from "../../../core/utils";
import { T } from "../../../translations";
import { enumAnalyticsDataSource } from "../../production_analytics";
import { GameRoot } from "../../root";
import { ShapeDefinition } from "../../shape_definition";

/**
 @enum
*/
export const enumDisplayMode = {
    icons: "icons",
    detailed: "detailed",
};
export type enumDisplayMode = keyof typeof enumDisplayMode;

/** Stores how many seconds one unit is */
export const statisticsUnitsSeconds: {
    [idx: string]: number;
} = {
    second: 1,
    minute: 60,
    hour: 3600,
};

/** Simple wrapper for a shape definition within the shape statistics */
export class HUDShapeStatisticsHandle {

    public visible = false;
    public element: HTMLDivElement;
    public counter: HTMLSpanElement;
    public shapeCanvas: HTMLCanvasElement;
    public graphCanvas: HTMLCanvasElement;
    public graphContext: CanvasRenderingContext2D;

    constructor(public root: GameRoot, public definition: ShapeDefinition, public intersectionObserver: IntersectionObserver) { }

    initElement() {
        this.element = document.createElement("div");
        this.element.setAttribute("data-shape-key", this.definition.getHash());

        this.counter = document.createElement("span");
        this.counter.classList.add("counter");
        this.element.appendChild(this.counter);
    }

    /** Sets whether the shape handle is visible currently */
    setVisible(visibility: boolean) {
        if (visibility === this.visible) {
            return;
        }
        this.visible = visibility;
        if (visibility) {
            if (!this.shapeCanvas) {
                // Create elements
                this.shapeCanvas = this.definition.generateAsCanvas(100);
                this.shapeCanvas.classList.add("icon");
                this.element.appendChild(this.shapeCanvas);
            }
        } else {
            // Drop elements
            this.cleanupChildElements();
        }
    }

    update(
        displayMode: enumDisplayMode,
        dataSource: enumAnalyticsDataSource,
        unit: string,
        forced: boolean = false
    ) {
        if (!this.element) {
            return;
        }
        if (!this.visible && !forced) {
            return;
        }

        this.element.classList.toggle(
            "pinned",
            this.root.hud.parts.pinnedShapes.isShapePinned(this.definition.getHash())
        );

        switch (dataSource) {
            case enumAnalyticsDataSource.stored: {
                this.counter.innerText = formatBigNumber(
                    this.root.hubGoals.storedShapes[this.definition.getHash()] || 0
                );
                break;
            }
            case enumAnalyticsDataSource.delivered:
            case enumAnalyticsDataSource.produced: {
                let rate =
                    this.root.productionAnalytics.getCurrentShapeRateRaw(dataSource, this.definition) /
                    globalConfig.analyticsSliceDurationSeconds;

                this.counter.innerText = T.ingame.statistics.shapesDisplayUnits[unit].replace(
                    "<shapes>",
                    formatBigNumber(rate * statisticsUnitsSeconds[unit])
                );
                break;
            }
        }

        if (displayMode === enumDisplayMode.detailed) {
            const graphDpi = globalConfig.statisticsGraphDpi;

            const w = 270;
            const h = 40;

            if (!this.graphCanvas) {
                const [canvas, context] = makeOffscreenBuffer(w * graphDpi, h * graphDpi, {
                    smooth: true,
                    reusable: false,
                    label: "statgraph-" + this.definition.getHash(),
                });
                context.scale(graphDpi, graphDpi);
                canvas.classList.add("graph");
                this.graphCanvas = canvas;
                this.graphContext = context;
                this.element.appendChild(this.graphCanvas);
            }

            this.graphContext.clearRect(0, 0, w, h);

            this.graphContext.fillStyle = "#bee0db";
            this.graphContext.strokeStyle = "#66ccbc";
            this.graphContext.lineWidth = 1.5;

            const sliceWidth = w / (globalConfig.statisticsGraphSlices - 1);

            let values = [];
            let maxValue = 1;

            for (let i = 0; i < globalConfig.statisticsGraphSlices - 2; ++i) {
                const value = this.root.productionAnalytics.getPastShapeRate(
                    dataSource,
                    this.definition,
                    globalConfig.statisticsGraphSlices - i - 2
                );
                if (value > maxValue) {
                    maxValue = value;
                }
                values.push(value);
            }

            this.graphContext.beginPath();
            this.graphContext.moveTo(0.75, h + 5);
            for (let i = 0; i < values.length; ++i) {
                const yValue = clamp((1 - values[i] / maxValue) * h, 0.75, h - 0.75);
                const x = i * sliceWidth;
                if (i === 0) {
                    this.graphContext.lineTo(0.75, yValue);
                }
                this.graphContext.lineTo(x, yValue);
                if (i === values.length - 1) {
                    this.graphContext.lineTo(w + 100, yValue);
                    this.graphContext.lineTo(w + 100, h + 5);
                }
            }

            this.graphContext.closePath();
            this.graphContext.stroke();
            this.graphContext.fill();
        } else {
            if (this.graphCanvas) {
                this.graphCanvas.remove();
                delete this.graphCanvas;
                delete this.graphContext;
            }
        }
    }

    /** Attaches the handle */
    attach(parent: HTMLElement) {
        if (!this.element) {
            this.initElement();
        }
        if (this.element.parentElement !== parent) {
            parent.appendChild(this.element);
            this.intersectionObserver.observe(this.element);
        }
    }

    /** Detaches the handle */
    detach() {
        if (this.element && this.element.parentElement) {
            this.element.parentElement.removeChild(this.element);
            this.intersectionObserver.unobserve(this.element);
        }
    }

    /** Cleans up all child elements */
    cleanupChildElements() {
        if (this.shapeCanvas) {
            this.shapeCanvas.remove();
            delete this.shapeCanvas;
        }

        if (this.graphCanvas) {
            this.graphCanvas.remove();
            delete this.graphCanvas;
            delete this.graphContext;
        }
    }

    /** Destroys the handle */
    destroy() {
        this.cleanupChildElements();
        if (this.element) {
            this.intersectionObserver.unobserve(this.element);
            this.element.remove();
            delete this.element;

            // Remove handle
            delete this.counter;
        }
    }
}
