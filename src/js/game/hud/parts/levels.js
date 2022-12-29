import { InputReceiver } from "../../../core/input_receiver";
import { makeDiv } from "../../../core/utils";
import { T } from "../../../translations";
import { FreeplayShape } from "../../freeplay_shape";
import { KeyActionMapper, KEYMAPPINGS } from "../../key_action_mapper";
import { BaseHUDPart } from "../base_hud_part";
import { DynamicDomAttach } from "../dynamic_dom_attach";

export class HUDLevels extends BaseHUDPart {
    createElements(parent) {
        this.background = makeDiv(parent, "ingame_HUD_Levels", ["ingameDialog"]);

        // DIALOG Inner / Wrapper
        this.dialogInner = makeDiv(this.background, null, ["dialogInner"]);
        this.title = makeDiv(this.dialogInner, null, ["title"], T.ingame.levels.title);
        this.closeButton = makeDiv(this.title, null, ["closeButton"]);
        this.trackClicks(this.closeButton, this.close);
        this.contentDiv = makeDiv(this.dialogInner, null, ["content"]);

        this.chapterInfo = makeDiv(this.contentDiv, null, ["info"]);
        this.chapterHeader = makeDiv(this.chapterInfo, null, ["header"]);
        this.chapterTitle = makeDiv(this.chapterHeader, null, ["title"], "default");
        const close = makeDiv(this.chapterHeader, null, ["closeButton"]);
        this.trackClicks(close, () => {
            this.chapterInfo.classList.remove("active");
        });
        this.chapterDescription = makeDiv(this.chapterInfo, null, ["description"]);

        makeDiv(this.chapterInfo, null, ["subtitle"], T.ingame.levels.goals);
        this.chapterGoalsContainer = makeDiv(this.chapterInfo, null, ["goals"]);

        this.chapterGoalsProgress = makeDiv(this.chapterGoalsContainer, null, ["progress"]);
        this.chapterGoalsProgressBar = makeDiv(this.chapterGoalsProgress, null, ["bar"]);
        this.chapterGoalsProgressThumb = makeDiv(this.chapterGoalsProgress, null, ["thumb"]);

        this.chapterGoals = makeDiv(this.chapterGoalsContainer, null, ["container"]);

        this.chapterButton = makeDiv(this.chapterInfo, null, ["button"], T.ingame.levels.activate);
        this.trackClicks(this.chapterButton, () => {
            const levels = this.root.gameMode.getLevelSet();
            if (
                !this.selectedChapter ||
                levels.activeChapterId === this.selectedChapter.id ||
                this.selectedChapter.isCompleted() ||
                !this.selectedChapter.isUnlocked(this.getTree())
            )
                return;

            const success = levels.setActiveChapter(this.selectedChapter.id);
            this.chapterButton.classList.toggle("active", !success);
        });

        // Chapters
        this.chapterDivs = {};
        for (let i = 0; i < this.root.gameMode.getLevelSet().chapters.length; i++) {
            const chapter = this.root.gameMode.getLevelSet().chapters[i];
            const chapterDiv = makeDiv(this.contentDiv, "chapter-" + chapter.id, ["chapter"]);
            this.chapterDivs[chapter.id] = chapterDiv;

            // If unlocked show sidepanel
            this.trackClicks(chapterDiv, () => {
                if (!chapter.isUnlocked(this.getTree())) return;
                this.selectChapter(chapter);
            });

            const goal = chapter.getActiveGoal() ? chapter.getActiveGoal() : chapter.goals[0];
            const shapeDef = this.root.shapeDefinitionMgr.getShapeFromShortKey(
                typeof goal.shape === "string"
                    ? goal.shape
                    : FreeplayShape.computeFreeplayShape(chapter.id, goal.id, this.root.map.seed, goal.shape)
            );
            const shapeCanvas = shapeDef.generateAsCanvas(120);
            shapeCanvas.classList.add("shape");
            chapterDiv.appendChild(shapeCanvas);

            const locked = makeDiv(chapterDiv, null, ["locked"]);
            makeDiv(locked, null, ["lock"]);
            const inner = makeDiv(locked, null, []);
            inner.innerText = "Locked";

            const title = makeDiv(chapterDiv, null, ["title"]);
            const titleText = makeDiv(title, null, ["text"]);
            titleText.innerText = chapter.label;
        }

        // Connection lines
        this.connection = {};
        for (let y = 0; y < this.getTree().length; y++) {
            const rows = this.getTree()[y];
            if (y > 0) {
                this.connection[y + "-down"] = makeDiv(this.contentDiv, "connection-down" + y, [
                    "connection-down",
                ]);
                this.connection[y + "-side"] = makeDiv(this.contentDiv, "connection-side" + y, [
                    "connection-side",
                ]);
                this.connection[y + "-top"] = makeDiv(this.contentDiv, "connection-top" + y, [
                    "connection-top",
                ]);
            }
            for (let x = 0; x < rows.length - 1; x++) {
                if (!rows[x]) continue;
                this.connection[x + "-" + y] = makeDiv(this.contentDiv, "connection-" + x + "-" + y, [
                    "connection",
                ]);
            }
        }

        this.offset = makeDiv(this.contentDiv, null, ["offset"]);

        // Grab scroll
        let isDown = false;
        let startX, startY;
        let scrollLeft, scrollTop;

        this.contentDiv.addEventListener("mousedown", e => {
            isDown = true;
            this.contentDiv.classList.add("active");

            startX = e.pageX - this.contentDiv.offsetLeft;
            scrollLeft = this.contentDiv.scrollLeft;

            startY = e.pageY - this.contentDiv.offsetTop;
            scrollTop = this.contentDiv.scrollTop;
        });
        this.contentDiv.addEventListener("mouseleave", () => {
            isDown = false;
            this.contentDiv.classList.remove("active");
        });
        this.contentDiv.addEventListener("mouseup", () => {
            isDown = false;
            this.contentDiv.classList.remove("active");
        });
        this.contentDiv.addEventListener("mousemove", e => {
            if (!isDown) return;
            e.preventDefault();

            const x = e.pageX - this.contentDiv.offsetLeft;
            const walkX = x - startX;
            this.contentDiv.scrollLeft = scrollLeft - walkX;

            const y = e.pageY - this.contentDiv.offsetTop;
            const walkY = y - startY;
            this.contentDiv.scrollTop = scrollTop - walkY;
        });
    }

    createChapterTree() {
        const levels = this.root.gameMode.getLevelSet();

        const chapters = levels.chapters.filter(x => !x.sideChapter);
        const tree = [this.order(this.createSet(chapters))];

        for (let i = tree[0].length - 1; i >= 0; i--) {
            const chapter = tree[0][i];
            const side = this.createChapterSideTree(chapter);
            tree.push(
                ...side.map(x => {
                    for (let j = 0; j < i; j++) {
                        x.unshift(null);
                    }

                    return x;
                })
            );
        }

        return tree;
    }

    createChapterSideTree(chapter) {
        const tree = [];
        const levels = this.root.gameMode.getLevelSet();

        const sideChapters = levels.chapters.filter(x => x.sideChapter && x.parentId === chapter.id);

        for (let j = 0; j < sideChapters.length; j++) {
            const sideChapter = sideChapters[j];
            const sideChapterTree = [
                sideChapter,
                ...this.order(this.createSet(levels.chapters.filter(x => !x.sideChapter)), sideChapter.id),
            ];
            tree.push([null, ...sideChapterTree]);

            for (let i = sideChapterTree.length - 1; i >= 0; i--) {
                const subSideChapterTree = this.createChapterSideTree(sideChapterTree[i]);
                if (subSideChapterTree.length > 0) tree.push(...subSideChapterTree.map(x => [null, ...x]));
            }
        }

        return tree;
    }

    createSet(chapters) {
        const set = {};
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];

            if (!set[chapter.parentId || "startChapter"]) set[chapter.parentId || "startChapter"] = [];
            set[chapter.parentId || "startChapter"].push(chapter);
        }

        return set;
    }

    order(set, key = "startChapter", result = []) {
        if (set[key] === undefined) return [];
        const arr = set[key].sort((a, b) => (set[a.id] ? 1 : set[b.id] ? -1 : 0));

        result = result.concat(arr);
        for (let i = 0; i < arr.length; i++) {
            const chapter = arr[i];
            result = result.concat(this.order(set, chapter.id));
        }

        return result;
    }

    rerenderFull() {
        const yOffset = 0;
        const xOffset = 0;
        const uiScale = Number(getComputedStyle(document.body).getPropertyValue("--ui-scale"));

        const levels = this.root.gameMode.getLevelSet();

        let maxY = 0,
            maxX = 0;
        for (let actualY = 0; actualY < this.getTree().length; actualY++) {
            const row = this.getTree()[actualY];

            // Collapse if no other chapter is in the way
            let y = actualY;
            const firstChapter = row.findIndex(x => !!x);

            let collapsed = false;
            for (let i = actualY; i >= 0; i--) {
                let isEmpty = true;

                for (let j = firstChapter; j < row.length; j++) {
                    if (!this.getTree()[i] || !this.getTree()[i][j]) continue;
                    isEmpty = false;
                }

                if (!isEmpty) continue;
                collapsed = true;
                y--;
            }
            // This is needed else some lines will overlap
            if (collapsed) y += 1;

            // Position chapters and lines
            for (let x = 0; x < row.length; x++) {
                const chapter = row[x];
                if (!chapter) continue;
                const chapterDiv = this.chapterDivs[chapter.id];

                const top = yOffset + y * 150 * uiScale;
                const left = xOffset + x * 140 * uiScale;
                if (top > maxY) maxY = top + chapterDiv.clientHeight;
                if (left > maxX) maxX = left + chapterDiv.clientWidth;

                chapterDiv.style.top = top + "px";
                chapterDiv.style.left = left + "px";

                let bar = chapterDiv.querySelector(".bar");
                const title = chapterDiv.querySelector(".title");
                if (levels.getActiveChapter() && levels.getActiveChapter().id === chapter.id) {
                    if (!bar) bar = makeDiv(chapterDiv.querySelector(".title"), null, ["bar"]);
                    bar.style.width =
                        (title.clientWidth / chapter.goals.length) * chapter.getCompletedGoals().length +
                        "px";
                } else if (bar) {
                    bar.remove();
                }

                const isUnlocked = chapter.isUnlocked(this.getTree());
                chapterDiv.classList.toggle("completed", chapter.isCompleted());
                chapterDiv.classList.toggle("unlocked", isUnlocked);

                const line = this.connection[x + "-" + actualY];
                if (!line) continue;
                line.classList.toggle("unlocked", chapter.isCompleted());
                line.style.top = yOffset + chapterDiv.clientHeight / 2 + y * 150 * uiScale + "px";
                line.style.left = xOffset + chapterDiv.clientWidth + x * 140 * uiScale + "px";
            }

            // Position side chapter lines
            const parentRow = this.getTree().findIndex(x =>
                x.some(y => y && y.id === row[firstChapter].parentId)
            );
            const chapterDiv = this.chapterDivs[row[firstChapter].id];
            const lineDown = this.connection[actualY + "-down"];
            const lineSide = this.connection[actualY + "-side"];
            const lineTop = this.connection[actualY + "-top"];

            const chapter = row[firstChapter];
            const parent = levels.chapters.find(x => x.id === row[firstChapter].parentId);
            if (typeof parentRow !== "undefined" && lineDown && lineSide) {
                const isUnlocked = chapter.isUnlocked(this.getTree());

                lineSide.style.top = yOffset + chapterDiv.clientHeight / 2 + y * 150 * uiScale + "px";
                lineSide.style.left = xOffset + -uiScale * 30 + firstChapter * 140 * uiScale + "px";
                lineSide.classList.toggle("unlocked", isUnlocked);

                const height = ((parent.sideChapter ? actualY : y) - parentRow) * 150 * uiScale;
                const top = yOffset + -height + chapterDiv.clientHeight / 2 + y * 150 * uiScale;
                lineDown.style.top = top + "px";
                lineDown.style.left = xOffset + -uiScale * 30 + firstChapter * 140 * uiScale + "px";
                lineDown.style.height = height + 5 * uiScale + "px";
                lineDown.classList.toggle("unlocked", isUnlocked);

                lineTop.style.top = top + "px";
                lineTop.style.left =
                    xOffset + chapterDiv.clientWidth + (firstChapter - 1) * 140 * uiScale + "px";
                lineTop.classList.toggle("unlocked", isUnlocked);
            }
        }

        this.offset.style.top = maxY + yOffset + "px";
        this.offset.style.left = maxX + xOffset + "px";
    }

    selectChapter(chapter) {
        this.selectedChapter = chapter;

        if (!this.chapterInfo.classList.contains("active") || this.chapterTitle.innerText === chapter.label) {
            this.chapterInfo.classList.toggle("active");
        }

        this.chapterTitle.innerText = chapter.label;
        this.chapterDescription.innerText = chapter.description;
        this.chapterButton.classList.toggle(
            "active",
            !chapter.isCompleted() &&
                this.root.gameMode.getLevelSet().activeChapterId !== this.selectedChapter.id
        );

        this.chapterGoals.innerText = "";

        for (let i = 0; i < chapter.goals.length; i++) {
            const goal = chapter.goals[i];
            const goalDiv = makeDiv(this.chapterGoals, null, [
                "goal",
                chapter.getCompletedGoals().some(x => x.id === goal.id) && "completed",
            ]);

            const shapeDef = this.root.shapeDefinitionMgr.getShapeFromShortKey(
                typeof goal.shape === "string"
                    ? goal.shape
                    : FreeplayShape.computeFreeplayShape(chapter.id, goal.id, this.root.map.seed, goal.shape)
            );
            const shapeCanvas = shapeDef.generateAsCanvas(120);
            shapeCanvas.classList.add("shape");
            goalDiv.appendChild(shapeCanvas);

            makeDiv(goalDiv, null, ["reward"], T.storyRewards[goal.reward].title.toUpperCase());
        }

        const barHeight =
            this.chapterGoals.lastElementChild.getBoundingClientRect().top +
            this.chapterGoals.lastElementChild.clientHeight -
            this.chapterGoals.getBoundingClientRect().top;

        this.chapterGoalsProgress.style.height = barHeight + "px";

        // thumb on completed
        const uiScale = Number(getComputedStyle(document.body).getPropertyValue("--ui-scale"));
        if (chapter.isCompleted()) {
            this.chapterGoalsProgressBar.style.height = barHeight + "px";
            this.chapterGoalsProgressThumb.style.top = barHeight - 8 * uiScale + "px";
        } else {
            this.chapterGoalsProgressBar.style.height =
                (barHeight / chapter.goals.length) * (chapter.getCompletedGoals().length + 0.6) + "px";
            this.chapterGoalsProgressThumb.style.top =
                (barHeight / chapter.goals.length) * (chapter.getCompletedGoals().length + 0.6) -
                8 * uiScale +
                "px";
        }
    }

    initialize() {
        this.domAttach = new DynamicDomAttach(this.root, this.background, {
            attachClass: "visible",
        });

        this.inputReciever = new InputReceiver("levels");
        this.keyActionMapper = new KeyActionMapper(this.root, this.inputReciever);

        this.keyActionMapper.getBinding(KEYMAPPINGS.general.back).add(this.close, this);
        this.keyActionMapper.getBinding(KEYMAPPINGS.ingame.menuClose).add(this.close, this);
        window.addEventListener("keydown", this.goToGoal.bind(this));

        this.close();

        this.rerenderFull();
        this.root.signals.storyGoalCompleted.add(this.rerenderFull, this);
        this.root.signals.chapterChanged.add(() => {
            this.rerenderFull();
            if (this.selectedChapter) this.selectChapter(this.selectedChapter);
        }, this);
    }

    cleanup() {
        window.removeEventListener("keydown", this.goToGoal);
    }

    show() {
        this.visible = true;
        this.root.app.inputMgr.makeSureAttachedAndOnTop(this.inputReciever);

        // Scroll to current active chapter
        setTimeout(() => {
            this.rerenderFull();
            if (this.root.gameMode.getLevelSet().getActiveChapter()) {
                this.chapterDivs[this.root.gameMode.getLevelSet().getActiveChapter().id].scrollIntoView({
                    behaviour: "smooth",
                    block: "center",
                    inline: "center",
                });
            }
        }, 100);
    }

    close() {
        if (this.chapterInfo.classList.contains("active")) {
            this.chapterInfo.classList.remove("active");
        } else {
            this.visible = false;
            this.root.app.inputMgr.makeSureDetached(this.inputReciever);
            this.update();
        }
    }

    /**
     * @param {KeyboardEvent} e
     */
    goToGoal(e) {
        if (e.keyCode !== KEYMAPPINGS.navigation.centerMap.keyCode) return;

        e.preventDefault();
        if (this.root.gameMode.getLevelSet().getActiveChapter()) {
            this.chapterDivs[this.root.gameMode.getLevelSet().getActiveChapter().id].scrollIntoView({
                behaviour: "smooth",
                block: "center",
                inline: "center",
            });
        }
    }

    update() {
        this.domAttach.update(this.visible);
        if (this.visible) {
            const modifier = this.keyActionMapper.getBinding(KEYMAPPINGS.navigation.mapMoveFaster).pressed
                ? 4
                : 1;

            if (this.keyActionMapper.getBinding(KEYMAPPINGS.navigation.mapMoveDown).pressed) {
                this.contentDiv.scrollTop += 5 * modifier;
            }
            if (this.keyActionMapper.getBinding(KEYMAPPINGS.navigation.mapMoveUp).pressed) {
                this.contentDiv.scrollTop -= 5 * modifier;
            }
            if (this.keyActionMapper.getBinding(KEYMAPPINGS.navigation.mapMoveRight).pressed) {
                this.contentDiv.scrollLeft += 5 * modifier;
            }
            if (this.keyActionMapper.getBinding(KEYMAPPINGS.navigation.mapMoveLeft).pressed) {
                this.contentDiv.scrollLeft -= 5 * modifier;
            }
        }
    }

    isBlockingOverlay() {
        return this.visible;
    }

    getTree() {
        if (this.tree) return this.tree;
        return (this.tree = this.createChapterTree());
    }
}
