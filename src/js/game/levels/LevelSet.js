import { GameRoot } from "../root";
import { LevelChapter } from "./LevelChapter";

export class LevelSet {
    /**
     * @param {GameRoot} root
     * @param {LevelChapter[]} chapters
     */
    constructor(root, chapters = []) {
        this.root = root;

        this.chapters = chapters;
        this.activeChapterId = this.chapters[0] ? this.chapters[0].id : null;

        return this;
    }

    /**
     * @param {LevelChapter} chapter
     * @param {{after: string| null, before: string | null}} param1
     */
    addChapter(chapter, { after = null, before = null } = { after: null, before: null }) {
        chapter.levelSet = this;

        if (this.chapters.some(x => x.id === chapter.id)) return this;

        if (before) {
            this.chapters.splice(this.chapters.findIndex(x => x.id === before) - 1, 0, chapter);
        } else if (after) {
            this.chapters.splice(this.chapters.findIndex(x => x.id === after) + 1, 0, chapter);
        } else {
            this.chapters.push(chapter);
        }

        if (!this.activeChapterId) this.activeChapterId = this.chapters[0] ? this.chapters[0].id : null;

        return this;
    }

    /**
     * @param {string} id
     */
    removeChapter(id) {
        if (!this.chapters.some(x => x.id === id)) return this;

        if (this.activeChapterId === id) {
            this.activeChapterId = this.chapters[0] ? this.chapters[0].id : null;
        }

        this.chapters.splice(
            this.chapters.findIndex(x => x.id === id),
            1
        );

        return this;
    }

    /**
     * Returns all level goals in the level set
     * @returns {import("./LevelChapter").LevelGoal[]}
     */
    getAllGoals() {
        return this.chapters.map(x => x.goals).reduce((x, y) => x.concat(y), []);
    }

    /**
     * Returns all level goals in the level set that are completed
     * @returns {import("./LevelChapter").LevelGoal[]}
     */
    getCompletedGoals() {
        return this.chapters.map(x => x.getCompletedGoals()).reduce((x, y) => x.concat(y), []);
    }

    /**
     * Returns the current active chapter
     * @returns {LevelChapter | null}
     */
    getActiveChapter() {
        return this.chapters.find(x => x.id === this.activeChapterId) || null;
    }

    /**
     * Returns the current active chapter
     * @param {LevelChapter[][]} tree
     * @returns {LevelChapter | null}
     */
    getNextChapter(tree) {
        if (!this.activeChapterId) return tree[0].find(x => !x.isCompleted()) || null;

        const chapter = this.getActiveChapter();

        let row = tree.findIndex(x => x.some(y => y && y.id === chapter.id));
        if (row < 0) return null;

        let nextChapter = tree[row].findIndex(x => x && x.id === chapter.id) + 1;
        while (nextChapter >= tree[row].length) {
            const treeStart = tree[row].find(x => x && x.parentId && x.sideChapter);
            if (!treeStart || !treeStart.parentId) return tree[0].find(x => !x.isCompleted()) || null;

            const parent = this.chapters.find(x => x.id === treeStart.parentId);
            if (!parent) return tree[0].find(x => !x.isCompleted()) || null;

            row = tree.findIndex(x => x.some(y => y && y.id === parent.id));
            nextChapter = tree[row].findIndex(x => x && x.id === parent.id) + 1;
        }

        while (tree[row][nextChapter] && tree[row][nextChapter].isCompleted()) {
            nextChapter++;
        }

        if (!tree[row][nextChapter]) tree[0].find(x => !x.isCompleted()) || null;

        return tree[row][nextChapter];
    }

    /**
     * Current active goal to be completed in the set
     * @returns {import("./LevelChapter").LevelGoal | null}
     */
    getActiveGoal() {
        const chapter = this.getActiveChapter();
        return chapter && chapter.getActiveGoal() ? chapter.getActiveGoal() : null;
    }

    /**
     * Set the current active chapter
     * @param {string} id
     * @returns {boolean} Succeeded
     */
    setActiveChapter(id) {
        if (!this.chapters.some(x => x.id === id)) return false;
        if (this.activeChapterId === id) return true;

        this.activeChapterId = id;
        this.root.signals.chapterChanged.dispatch(id);
        return true;
    }

    /**
     * Disable the current active chapter
     */
    disableActiveChapter() {
        this.activeChapterId = null;
        this.root.signals.chapterChanged.dispatch(null);
    }

    /**
     * Are all chapters completed
     * @param {boolean} sideChapters
     * @returns {boolean}
     */
    isCompleted(sideChapters = false) {
        return this.chapters.every(x => (sideChapters ? x.isCompleted() : x.sideChapter || x.isCompleted));
    }
}
