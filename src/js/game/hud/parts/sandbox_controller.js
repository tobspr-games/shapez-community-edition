import { queryParamOptions } from "../../../core/query_parameters";
import { makeDiv } from "../../../core/utils";
import { BaseHUDPart } from "../base_hud_part";
import { DynamicDomAttach } from "../dynamic_dom_attach";
import { enumNotificationType } from "./notifications";

export class HUDSandboxController extends BaseHUDPart {
    createElements(parent) {
        this.element = makeDiv(
            parent,
            "ingame_HUD_SandboxController",
            [],
            `
            <label>Sandbox Options</label>
            <span class="sandboxHint">Use F6 to toggle this overlay</span>

            <div class="buttons">
                <div class="levelToggle plusMinus">
                    <label>Level</label>
                    <button class="styledButton minus">-</button>
                    <button class="styledButton plus">+</button>
                </div>

                <div class="upgradesBelt plusMinus">
                    <label>Upgrades &rarr; Belt</label>
                    <button class="styledButton minus">-</button>
                    <button class="styledButton plus">+</button>
                </div>

                <div class="upgradesExtraction plusMinus">
                    <label>Upgrades &rarr; Extraction</label>
                    <button class="styledButton minus">-</button>
                    <button class="styledButton plus">+</button>
                </div>

                <div class="upgradesProcessing plusMinus">
                    <label>Upgrades &rarr; Processing</label>
                    <button class="styledButton minus">-</button>
                    <button class="styledButton plus">+</button>
                </div>

                <div class="upgradesPainting plusMinus">
                    <label>Upgrades &rarr; Painting</label>
                    <button class="styledButton minus">-</button>
                    <button class="styledButton plus">+</button>
                </div>

                <div class="additionalOptions">
                    <button class="styledButton giveBlueprints">Fill blueprint shapes</button>
                    <button class="styledButton maxOutAll">Max out all</button>
                </div>
            </div>
        `
        );

        const bind = (selector, handler) => this.trackClicks(this.element.querySelector(selector), handler);

        bind(".giveBlueprints", this.giveBlueprints);
        bind(".maxOutAll", this.maxOutAll);
        bind(".levelToggle .minus", () => this.modifyLevel(-1));
        bind(".levelToggle .plus", () => this.modifyLevel(1));

        bind(".upgradesBelt .minus", () => this.modifyUpgrade("belt", -1));
        bind(".upgradesBelt .plus", () => this.modifyUpgrade("belt", 1));

        bind(".upgradesExtraction .minus", () => this.modifyUpgrade("miner", -1));
        bind(".upgradesExtraction .plus", () => this.modifyUpgrade("miner", 1));

        bind(".upgradesProcessing .minus", () => this.modifyUpgrade("processors", -1));
        bind(".upgradesProcessing .plus", () => this.modifyUpgrade("processors", 1));

        bind(".upgradesPainting .minus", () => this.modifyUpgrade("painting", -1));
        bind(".upgradesPainting .plus", () => this.modifyUpgrade("painting", 1));
    }

    giveBlueprints() {
        const shape = this.root.gameMode.getBlueprintShapeKey();
        if (!this.root.hubGoals.storedShapes[shape]) {
            this.root.hubGoals.storedShapes[shape] = 0;
        }
        this.root.hubGoals.storedShapes[shape] += 1e9;
    }

    maxOutAll() {
        this.modifyUpgrade("belt", 100);
        this.modifyUpgrade("miner", 100);
        this.modifyUpgrade("processors", 100);
        this.modifyUpgrade("painting", 100);
    }

    modifyUpgrade(id, amount) {
        const upgradeTiers = this.root.gameMode.getUpgrades()[id];
        const maxLevel = upgradeTiers.length;

        this.root.hubGoals.upgradeLevels[id] = Math.max(
            0,
            Math.min(maxLevel, (this.root.hubGoals.upgradeLevels[id] || 0) + amount)
        );

        // Compute improvement
        let improvement = 1;
        for (let i = 0; i < this.root.hubGoals.upgradeLevels[id]; ++i) {
            improvement += upgradeTiers[i].improvement;
        }
        this.root.hubGoals.upgradeImprovements[id] = improvement;
        this.root.signals.upgradePurchased.dispatch(id);
        this.root.hud.signals.notification.dispatch(
            "Upgrade '" + id + "' is now at tier " + (this.root.hubGoals.upgradeLevels[id] + 1),
            enumNotificationType.upgrade
        );
    }

    modifyLevel(amount) {
        const hubGoals = this.root.hubGoals;
        const levels = this.root.gameMode.getLevelSet();
        for (let i = 0; i < amount; i++) {
            const goal = levels.getActiveGoal();
            if (goal) {
                this.root.app.gameAnalytics.handleLevelCompleted(goal);
                levels.getActiveChapter().setGoalCompleted(goal.id);
                hubGoals.completed.push([levels.getActiveChapter().id, goal.id]);
            } else {
                hubGoals.completed.push(["shapez:freeplay", hubGoals.getFreeplayLevel().toString()]);
            }
        }
        hubGoals.computeNextGoal();

        // Clear all shapes of this level
        hubGoals.storedShapes[hubGoals.currentGoal.definition.getHash()] = 0;

        if (this.root.hud.parts.pinnedShapes) {
            this.root.hud.parts.pinnedShapes.rerenderFull();
        }

        // Compute gained rewards
        hubGoals.gainedRewards = {};
        for (let i = 0; i < hubGoals.completed.length; ++i) {
            const completed = hubGoals.completed[i];
            const chapter = levels.chapters.find(x => x.id === completed[0]);
            if (!chapter) continue;
            const goal = chapter.goals.find(x => x.id === completed[1]);
            if (!goal) continue;
            chapter.setGoalCompleted(goal.id);
            hubGoals.gainedRewards[goal.reward] = (hubGoals.gainedRewards[goal.reward] || 0) + 1;
        }

        this.root.hud.signals.notification.dispatch(
            "Changed level to " +
                levels.getActiveChapter().label +
                " " +
                levels.getActiveChapter().getCompletedGoals().length,
            enumNotificationType.upgrade
        );
    }

    initialize() {
        // Allow toggling the controller overlay
        this.root.gameState.inputReciever.keydown.add(key => {
            if (key.keyCode === 117) {
                // F6
                this.toggle();
            }
        });

        this.visible = false;
        this.domAttach = new DynamicDomAttach(this.root, this.element);
    }

    toggle() {
        this.visible = !this.visible;
    }

    update() {
        this.domAttach.update(this.visible);
    }
}
