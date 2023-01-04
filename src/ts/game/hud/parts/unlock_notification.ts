import { globalConfig } from "../../../core/config";
import { gMetaBuildingRegistry } from "../../../core/global_registries";
import { InputReceiver } from "../../../core/input_receiver";
import { makeDiv } from "../../../core/utils";
import { SOUNDS } from "../../../platform/sound";
import { T } from "../../../translations";
import { defaultBuildingVariant } from "../../meta_building";
import { enumHubGoalRewards } from "../../tutorial_goals";
import { enumHubGoalRewardsToContentUnlocked } from "../../tutorial_goals_mappings";
import { BaseHUDPart } from "../base_hud_part";
import { DynamicDomAttach } from "../dynamic_dom_attach";
import { enumNotificationType } from "./notifications";

export class HUDUnlockNotification extends BaseHUDPart {
    public visible: boolean;
    public domAttach: DynamicDomAttach;
    public element: HTMLDivElement;
    public buttonShowTimeout: number;
    public inputReciever: InputReceiver;
    public elemTitle: HTMLDivElement;
    public elemSubTitle: HTMLDivElement;
    public elemContents: HTMLDivElement;
    public btnClose: HTMLButtonElement;

    initialize() {
        this.visible = false;

        this.domAttach = new DynamicDomAttach(this.root, this.element, {
            timeToKeepSeconds: 0,
        });

        if (!(G_IS_DEV && globalConfig.debug.disableUnlockDialog)) {
            this.root.signals.storyGoalCompleted.add(this.showForLevel, this);
        }

        this.buttonShowTimeout = null;

        this.root.app.gameAnalytics.noteMinor("game.started");
    }

    shouldPauseGame() {
        return !G_IS_STANDALONE && this.visible;
    }

    createElements(parent) {
        this.inputReciever = new InputReceiver("unlock-notification");

        this.element = makeDiv(parent, "ingame_HUD_UnlockNotification", ["noBlur"]);

        const dialog = makeDiv(this.element, null, ["dialog"]);

        this.elemTitle = makeDiv(dialog, null, ["title"]);
        this.elemSubTitle = makeDiv(dialog, null, ["subTitle"], T.ingame.levelCompleteNotification.completed);

        this.elemContents = makeDiv(dialog, null, ["contents"]);

        this.btnClose = document.createElement("button");
        this.btnClose.classList.add("close", "styledButton");
        this.btnClose.innerText = T.ingame.levelCompleteNotification.buttonNextLevel;
        dialog.appendChild(this.btnClose);

        this.trackClicks(this.btnClose, this.requestClose);
    }

    showForLevel(level: number, reward: enumHubGoalRewards) {
        this.root.soundProxy.playUi(SOUNDS.levelComplete);

        const levels = this.root.gameMode.getLevelDefinitions();
        // Don't use getIsFreeplay() because we want the freeplay level up to show
        if (level > levels.length) {
            this.root.hud.signals.notification.dispatch(
                T.ingame.notifications.freeplayLevelComplete.replace("<level>", String(level)),
                enumNotificationType.success
            );
            return;
        }

        this.root.app.gameAnalytics.noteMinor("game.level.complete-" + level);

        this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReciever);
        this.elemTitle.innerText = T.ingame.levelCompleteNotification.levelTitle.replace(
            "<level>",
            ("" + level).padStart(2, "0")
        );

        const rewardName = T.storyRewards[reward].title;

        let html = `
        <div class="rewardName">
            ${T.ingame.levelCompleteNotification.unlockText.replace("<reward>", rewardName)}
        </div>

        <div class="rewardDesc">
            ${T.storyRewards[reward].desc}
        </div>

        `;

        html += "<div class='images'>";
        const gained = enumHubGoalRewardsToContentUnlocked[reward];
        if (gained) {
            gained.forEach(([metaBuildingClass, variant]) => {
                const metaBuilding = gMetaBuildingRegistry.findByClass(metaBuildingClass);
                html += `<div class="buildingExplanation" data-icon="building_tutorials/${
                    metaBuilding.getId() + (variant === defaultBuildingVariant ? "" : "-" + variant)
                }.png"></div>`;
            });
        }
        html += "</div>";

        this.elemContents.innerHTML = html;
        this.visible = true;

        if (this.buttonShowTimeout) {
            clearTimeout(this.buttonShowTimeout);
        }

        this.element.querySelector("button.close").classList.remove("unlocked");

        if (this.root.app.settings.getAllSettings().offerHints) {
            this.buttonShowTimeout = window.setTimeout(
                () => this.element.querySelector("button.close").classList.add("unlocked"),
                G_IS_DEV ? 100 : 1500
            );
        } else {
            this.element.querySelector("button.close").classList.add("unlocked");
        }
    }

    cleanup() {
        this.root.app.inputMgr.makeSureDetached(this.inputReciever);
        if (this.buttonShowTimeout) {
            clearTimeout(this.buttonShowTimeout);
            this.buttonShowTimeout = null;
        }
    }

    isBlockingOverlay() {
        return this.visible;
    }

    requestClose() {
        this.root.app.adProvider.showVideoAd().then(() => {
            this.close();

            this.root.hud.signals.unlockNotificationFinished.dispatch();

            if (
                this.root.hubGoals.level > this.root.gameMode.getLevelDefinitions().length - 1 &&
                this.root.app.restrictionMgr.getIsStandaloneMarketingActive()
            ) {
                this.root.hud.parts.standaloneAdvantages.show(true);
            }

            if (!this.root.app.settings.getAllSettings().offerHints) {
                return;
            }

            if (this.root.hubGoals.level === 3) {
                const { showUpgrades } = this.root.hud.parts.dialogs.showInfo(
                    T.dialogs.upgradesIntroduction.title,
                    T.dialogs.upgradesIntroduction.desc,
                    ["showUpgrades:good:timeout"]
                );
                showUpgrades.add(() => this.root.hud.parts.shop.show());
            }

            if (this.root.hubGoals.level === 5) {
                const { showKeybindings } = this.root.hud.parts.dialogs.showInfo(
                    T.dialogs.keybindingsIntroduction.title,
                    T.dialogs.keybindingsIntroduction.desc,
                    ["showKeybindings:misc", "ok:good:timeout"]
                );
                showKeybindings.add(() => this.root.gameState.goToKeybindings());
            }
        });
    }

    close() {
        this.root.app.inputMgr.makeSureDetached(this.inputReciever);
        if (this.buttonShowTimeout) {
            clearTimeout(this.buttonShowTimeout);
            this.buttonShowTimeout = null;
        }
        this.visible = false;
    }

    update() {
        this.domAttach.update(this.visible);
        if (!this.visible && this.buttonShowTimeout) {
            clearTimeout(this.buttonShowTimeout);
            this.buttonShowTimeout = null;
        }
    }
}
