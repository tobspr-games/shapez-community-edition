import { freeCanvas, makeOffscreenBuffer } from "../../../core/buffer_utils";
import { globalConfig } from "../../../core/config";
import { DrawParameters } from "../../../core/draw_parameters";
import { Loader } from "../../../core/loader";
import { Vector } from "../../../core/vector";
import { MapChunkView } from "../../map_chunk_view";
import { THEME } from "../../theme";
import { BaseHUDPart } from "../base_hud_part";
import type { AtlasSprite } from "c:/Dev Temp/ts/shapez-community-edition/src/ts/core/sprites";

/** Helper class which allows peaking through to the wires layer */
export class HUDLayerPreview extends BaseHUDPart {
    public previewOverlay: AtlasSprite;
    public context: any;
    public previewSize: number;

    initialize() {
        this.initializeCanvas();
        this.root.signals.aboutToDestruct.add(() => freeCanvas(this.canvas));
        this.root.signals.resized.add(this.initializeCanvas, this);
        this.previewOverlay = Loader.getSprite("sprites/wires/wires_preview.png");
    }

    // @Bagel03 WTF
    public canvas: HTMLCanvasElement;
    // canvas(canvas: any) {
    //     throw new Error("Method not implemented.");
    // }

    /** (re) initializes the canvas */
    initializeCanvas() {
        if (this.canvas) {
            freeCanvas(this.canvas);
            delete this.canvas;
            delete this.context;
        }

        // Compute how big the preview should be
        this.previewSize = Math.round(
            Math.min(1024, Math.min(this.root.gameWidth, this.root.gameHeight) * 0.8)
        );

        const [canvas, context] = makeOffscreenBuffer(this.previewSize, this.previewSize, {
            smooth: true,
            label: "layerPeeker",
            reusable: true,
        });

        context.clearRect(0, 0, this.previewSize, this.previewSize);
        this.canvas = canvas;
        this.context = context;
    }

    /**
     * Prepares the canvas to render at the given worldPos and the given camera scale
     * @param scale 1 / zoomLevel
     */
    prepareCanvasForPreview(worldPos: Vector, scale: number) {
        this.context.clearRect(0, 0, this.previewSize, this.previewSize);
        this.context.fillStyle = THEME.map.wires.previewColor;
        this.context.fillRect(0, 0, this.previewSize, this.previewSize);

        const dimensions = scale * this.previewSize;

        const startWorldX = worldPos.x - dimensions / 2;
        const startWorldY = worldPos.y - dimensions / 2;

        const startTileX = Math.floor(startWorldX / globalConfig.tileSize);
        const startTileY = Math.floor(startWorldY / globalConfig.tileSize);
        const tileDimensions = Math.ceil(dimensions / globalConfig.tileSize);

        this.context.save();
        this.context.scale(1 / scale, 1 / scale);
        this.context.translate(
            startTileX * globalConfig.tileSize - startWorldX,
            startTileY * globalConfig.tileSize - startWorldY
        );

        for (let dx = 0; dx < tileDimensions; ++dx) {
            for (let dy = 0; dy < tileDimensions; ++dy) {
                const tileX = dx + startTileX;
                const tileY = dy + startTileY;

                const content = this.root.map.getLayerContentXY(tileX, tileY, "wires");
                if (content) {
                    MapChunkView.drawSingleWiresOverviewTile({
                        context: this.context,
                        x: dx * globalConfig.tileSize,
                        y: dy * globalConfig.tileSize,
                        entity: content,
                        tileSizePixels: globalConfig.tileSize,
                    });
                }
            }
        }

        this.context.restore();
        this.context.globalCompositeOperation = "destination-in";
        this.previewOverlay.draw(this.context, 0, 0, this.previewSize, this.previewSize);
        this.context.globalCompositeOperation = "source-over";

        return this.canvas;
    }

    /**
     * Renders the preview at the given position
     * @param scale 1 / zoomLevel
     */
    renderPreview(parameters: DrawParameters, worldPos: Vector, scale: number) {
        if (this.root.currentLayer !== "regular") {
            // Only supporting wires right now
            return;
        }

        const canvas = this.prepareCanvasForPreview(worldPos, scale);

        parameters.context.globalAlpha = 0.3;
        parameters.context.drawImage(
            canvas,
            worldPos.x - (scale * this.previewSize) / 2,
            worldPos.y - (scale * this.previewSize) / 2,
            scale * this.previewSize,
            scale * this.previewSize
        );
        parameters.context.globalAlpha = 1;
    }
}
