/**
 * @typedef {{
 * id: string
 * shape: string | import("../freeplay_shape").FreeplayOptions
 * required: number
 * throughputOnly?: boolean
 * reward: string
 * }} LevelGoal
 */

import { FreeplayShape } from "../freeplay_shape";
import { ShapeDefinition } from "../shape_definition";
import { LevelSet } from "./LevelSet";

export class LevelChapter {
    /**
     * @param {string} id
     * @param {string} label
     * @param {string} description
     * @param {LevelGoal[]} goals
     * @param {string | null} parentId
     */
    constructor(id, label, description, goals = [], parentId = null, sideChapter = false) {
        this.id = id;
        this.label = label;
        this.description = description;
        this.goals = goals;
        this.parentId = parentId;
        this.sideChapter = sideChapter;

        this.completedGoals = [];

        /** @type {LevelSet | null} Will be set when added to level set*/
        this.levelSet = null;

        return this;
    }

    /**
     * @param {LevelGoal} goal
     * @param {string | null} before Insert before existing goal id
     */
    addGoal(goal, before = null) {
        if (before) {
            this.goals.splice(this.goals.findIndex(x => x.id === before) - 1, 0, goal);
        } else {
            this.goals.push(goal);
        }

        return this;
    }

    /**
     * @param {string} id Id of the goal to remove
     */
    removeGoal(id) {
        const index = this.goals.findIndex(x => x.id === id);
        if (index < 0) return this;
        this.goals.splice(index, 1);

        return this;
    }

    /**
     * @param {LevelGoal} goal
     * @param {string} id Id of the goal to replace
     */
    replaceGoal(goal, id) {
        const index = this.goals.findIndex(x => x.id === id);
        if (index < 0) return this;
        this.goals.splice(index, 1, goal);

        return this;
    }

    /**
     * @param {string} id Id of the goal
     * @returns {boolean} Succeeded
     */
    setGoalCompleted(id) {
        const index = this.goals.findIndex(x => x.id === id);
        if (index < 0) return false;
        if (this.completedGoals.includes(id)) return true;

        this.completedGoals.push(id);
        return true;
    }

    /**
     * @param {string} id Id of the goal
     * @returns {boolean} Succeeded
     */
    removeGoalCompleted(id) {
        const index = this.goals.findIndex(x => x.id === id);
        if (index < 0) return false;
        if (!this.completedGoals.includes(id)) return true;

        this.completedGoals.splice(index, 1);
        return true;
    }

    /**
     * Get all goals that are completed
     * @returns {LevelGoal[]}
     */
    getCompletedGoals() {
        return this.goals.filter(x => this.completedGoals.includes(x.id));
    }

    /**
     * Current active goal to be completed in the chapter
     * @returns {LevelGoal | null}
     */
    getActiveGoal() {
        return this.goals.find(x => !this.completedGoals.includes(x.id)) || null;
    }

    /**
     * Are all goals completed
     * @returns {boolean}
     */
    isCompleted() {
        return this.goals.every(x => this.completedGoals.includes(x.id));
    }

    /**
     * Check if the chapter is unlocked for a specific tree
     * @param {LevelChapter[][]} tree
     * @returns {boolean}
     */
    isUnlocked(tree) {
        if (!this.levelSet) return true;

        if (this.sideChapter) {
            if (!this.parentId) return true;

            const parent = this.levelSet.chapters.find(x => x.id === this.parentId);
            if (!parent) return true;

            if (parent.isCompleted()) return true;
        }

        const row = tree.findIndex(x => x.some(y => y && y.id === this.id));
        if (row < 0) return true;

        const previousChapter = tree[row].findIndex(x => x && x.id === this.id) - 1;
        if (previousChapter < 0) return true;

        if (!this.sideChapter && tree[row][previousChapter].isCompleted()) return true;

        return false;
    }

    /**
     * @param {Omit<LevelGoal, 'shape'>} goal
     * @param {import("../freeplay_shape").FreeplayOptions} options
     * @param {string | null} before Insert before existing goal id
     * @returns {LevelChapter | null}
     */
    addRandomShape(goal, options, before = null) {
        return this.addGoal(
            {
                ...goal,
                shape: options,
            },
            before
        );
    }
}
