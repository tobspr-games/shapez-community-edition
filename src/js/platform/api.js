/* typehints:start */
import { Application } from "../application";
/* typehints:end */

import { DialogWithForm } from "root/core/modal_dialog_elements";
import { FormElementInput } from "root/core/modal_dialog_forms";
import { createLogger } from "../core/logging";
import { compressX64 } from "../core/lzstring";
import { timeoutPromise } from "../core/utils";
import { T } from "../translations";

const logger = createLogger("puzzle-api");

export class ClientAPI {
    /**
     *
     * @param {Application} app
     */
    constructor(app) {
        this.app = app;

        /**
         * The current users session token
         * @type {string|null}
         */
        this.token = null;
    }

    getEndpoint() {
        // TODO: Custom Puzzle DLC server / extract API into a mod?
        return "https://api.shapez.io";
    }

    isLoggedIn() {
        return Boolean(this.token);
    }

    /**
     *
     * @param {string} endpoint
     * @param {object} options
     * @param {"GET"|"POST"=} options.method
     * @param {any=} options.body
     */
    _request(endpoint, options) {
        const headers = {
            "x-api-key": "d5c54aaa491f200709afff082c153ef2",
            "Content-Type": "application/json",
        };

        if (this.token) {
            headers["x-token"] = this.token;
        }

        return timeoutPromise(
            fetch(this.getEndpoint() + endpoint, {
                cache: "no-cache",
                mode: "cors",
                headers,
                method: options.method || "GET",
                body: options.body ? JSON.stringify(options.body) : undefined,
            }),
            15000
        )
            .then(res => {
                if (res.status !== 200) {
                    throw "bad-status: " + res.status + " / " + res.statusText;
                }
                return res;
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.error) {
                    logger.warn("Got error from api:", data);
                    throw T.backendErrors[data.error] || data.error;
                }
                return data;
            })
            .catch(err => {
                logger.warn("Failure:", endpoint, ":", err);
                throw err;
            });
    }

    tryLogin() {
        return this.apiTryLogin()
            .then(({ token }) => {
                this.token = token;
                return true;
            })
            .catch(err => {
                logger.warn("Failed to login:", err);
                return false;
            });
    }

    /**
     * @returns {Promise<{token: string}>}
     */
    apiTryLogin() {
        // TODO: Wrap the dialogs hack properly (with a meaningful error at least)
        // ...AND REDUCE THIS BOILERPLATE!!!
        let token = window.localStorage.getItem("dev_api_auth_token");

        if (token !== null) {
            return Promise.resolve({ token });
        }

        const state = this.app.stateMgr.getCurrentState();
        if (!("dialogs" in state)) {
            return Promise.reject(new Error("Failed to show token input dialog"));
        }

        /** @type {import("../game/hud/parts/modal_dialogs").HUDModalDialogs} */
        // @ts-ignore
        const dialogs = state.dialogs;

        const apiTokenInput = new FormElementInput({
            id: "apiToken",
            placeholder: "",
            validator: value => value.trim().length > 0,
        });

        const dialog = new DialogWithForm({
            app: this.app,
            title: "API Login",
            desc: "Enter the Puzzle DLC API token:",
            formElements: [apiTokenInput],
            buttons: ["cancel", "ok:good"],
            closeButton: false,
        });

        return new Promise((resolve, reject) => {
            dialog.buttonSignals.ok.add(() => {
                resolve({
                    token: apiTokenInput.getValue(),
                });
            });

            dialog.buttonSignals.cancel.add(() => {
                reject(new Error("Token input dismissed"));
            });

            dialogs.internalShowDialog(dialog);
        });
    }

    /**
     * @param {"new"|"top-rated"|"mine"} category
     * @returns {Promise<import("../savegame/savegame_typedefs").PuzzleMetadata[]>}
     */
    apiListPuzzles(category) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/list/" + category, {});
    }

    /**
     * @param {{ searchTerm: string; difficulty: string; duration: string }} searchOptions
     * @returns {Promise<import("../savegame/savegame_typedefs").PuzzleMetadata[]>}
     */
    apiSearchPuzzles(searchOptions) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/search", {
            method: "POST",
            body: searchOptions,
        });
    }

    /**
     * @param {number} puzzleId
     * @returns {Promise<import("../savegame/savegame_typedefs").PuzzleFullData>}
     */
    apiDownloadPuzzle(puzzleId) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/download/" + puzzleId, {});
    }

    /**
     * @param {number} puzzleId
     * @returns {Promise<import("../savegame/savegame_typedefs").PuzzleFullData>}
     */
    apiDeletePuzzle(puzzleId) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/delete/" + puzzleId, {
            method: "POST",
            body: {},
        });
    }

    /**
     * @param {string} shortKey
     * @returns {Promise<import("../savegame/savegame_typedefs").PuzzleFullData>}
     */
    apiDownloadPuzzleByKey(shortKey) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/download/" + shortKey, {});
    }

    /**
     * @param {number} puzzleId
     * @returns {Promise<void>}
     */
    apiReportPuzzle(puzzleId, reason) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/report/" + puzzleId, {
            method: "POST",
            body: { reason },
        });
    }

    /**
     * @param {number} puzzleId
     * @param {object} payload
     * @param {number} payload.time
     * @param {boolean} payload.liked
     * @returns {Promise<{ success: true }>}
     */
    apiCompletePuzzle(puzzleId, payload) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/complete/" + puzzleId, {
            method: "POST",
            body: payload,
        });
    }

    /**
     * @param {object} payload
     * @param {string} payload.title
     * @param {string} payload.shortKey
     * @param {import("../savegame/savegame_typedefs").PuzzleGameData} payload.data
     * @returns {Promise<{ success: true }>}
     */
    apiSubmitPuzzle(payload) {
        if (!this.isLoggedIn()) {
            return Promise.reject("not-logged-in");
        }
        return this._request("/v1/puzzles/submit", {
            method: "POST",
            body: {
                ...payload,
                data: compressX64(JSON.stringify(payload.data)),
            },
        });
    }
}
