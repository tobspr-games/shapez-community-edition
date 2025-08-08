import { BaseItem } from "../game/base_item";
import { ClickDetector } from "./click_detector";
import { Signal } from "./signal";

/*
 * ***************************************************
 *
 *  LEGACY CODE WARNING
 *
 *  This is old code from yorg3.io and needs to be refactored
 *  @TODO
 *
 * ***************************************************
 */

export abstract class FormElement<T = string> {
    public valueChosen = new Signal<[T]>();

    constructor(
        public id: string,
        public label: string
    ) {}

    abstract getHtml(): string;

    getFormElement(parent: HTMLElement): HTMLElement {
        return parent.querySelector("[data-formId='" + this.id + "']");
    }

    abstract bindEvents(parent: HTMLDivElement, clickTrackers: ClickDetector[]): void;

    focus() {}

    isValid() {
        return true;
    }

    abstract getValue(): T;
}

export class FormElementInput extends FormElement {
    public placeholder: string;
    public defaultValue: string;
    public inputType: "text" | "email" | "token";
    public validator: (value: string) => boolean;

    public element: HTMLInputElement = null;

    constructor({
        id,
        label = null,
        placeholder,
        defaultValue = "",
        inputType = "text",
        validator = null,
    }: {
        id: string;
        label?: string;
        placeholder: string;
        defaultValue?: string;
        inputType?: "text" | "email" | "token";
        validator?: (value: string) => boolean;
    }) {
        super(id, label);
        this.placeholder = placeholder;
        this.defaultValue = defaultValue;
        this.inputType = inputType;
        this.validator = validator;
    }

    getHtml() {
        const classes = [];
        let inputType = "text";
        let maxlength = 256;
        // @TODO: `inputType` and these classes are unused
        switch (this.inputType) {
            case "text": {
                classes.push("input-text");
                break;
            }

            case "email": {
                classes.push("input-email");
                inputType = "email";
                break;
            }

            case "token": {
                classes.push("input-token");
                inputType = "text";
                maxlength = 4;
                break;
            }
        }

        return `
            <div class="formElement input">
                ${this.label ? `<label>${this.label}</label>` : ""}
                <input
                    type="${inputType}"
                    value="${this.defaultValue.replace(/["\\]+/gi, "")}"
                    maxlength="${maxlength}"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                    spellcheck="false"
                    class="${classes.join(" ")}"
                    placeholder="${this.placeholder.replace(/["\\]+/gi, "")}"
                    data-formId="${this.id}">
            </div>
        `;
    }

    bindEvents(parent: HTMLDivElement, clickTrackers: ClickDetector[]) {
        this.element = this.getFormElement(parent) as HTMLInputElement;
        this.element.addEventListener("input", event => this.updateErrorState());
        this.updateErrorState();
    }

    updateErrorState() {
        this.element.classList.toggle("errored", !this.isValid());
    }

    isValid() {
        return !this.validator || this.validator(this.element.value);
    }

    getValue() {
        return this.element.value;
    }

    setValue(value: string) {
        this.element.value = value;
        this.updateErrorState();
    }

    focus() {
        this.element.focus();
        this.element.select();
    }
}

export class FormElementCheckbox extends FormElement<boolean> {
    public defaultValue: boolean;
    public value: boolean;
    public element: HTMLDivElement;

    constructor({ id, label, defaultValue = true }) {
        super(id, label);
        this.defaultValue = defaultValue;
        this.value = this.defaultValue;

        this.element = null;
    }

    getHtml() {
        return `
            <div class="formElement checkBoxFormElem">
            ${this.label ? `<label>${this.label}</label>` : ""}
                <div class="checkbox ${this.defaultValue ? "checked" : ""}" data-formId='${this.id}'>
                    <span class="knob"></span >
                </div >
            </div>
        `;
    }

    bindEvents(parent: HTMLDivElement, clickTrackers: ClickDetector[]) {
        this.element = this.getFormElement(parent) as HTMLDivElement;
        const detector = new ClickDetector(this.element, {
            consumeEvents: false,
            preventDefault: false,
        });
        clickTrackers.push(detector);
        detector.click.add(this.toggle, this);
    }

    getValue() {
        return this.value;
    }

    toggle() {
        this.value = !this.value;
        this.element.classList.toggle("checked", this.value);
    }

    focus() {}
}

export class FormElementItemChooser extends FormElement<BaseItem> {
    public items: BaseItem[];
    public element: HTMLDivElement = null;
    public chosenItem: BaseItem = null;

    constructor({ id, label, items = [] }: { id: string; label: string; items: BaseItem[] }) {
        super(id, label);
        this.items = items;
    }

    getHtml() {
        const classes = [];

        return `
            <div class="formElement">
                ${this.label ? `<label>${this.label}</label>` : ""}
                <div class="ingameItemChooser input" data-formId="${this.id}"></div>
            </div>
            `;
    }

    bindEvents(parent: HTMLElement, clickTrackers: ClickDetector[]) {
        this.element = this.getFormElement(parent) as HTMLDivElement;

        for (let i = 0; i < this.items.length; ++i) {
            const item = this.items[i];

            const canvas = document.createElement("canvas");
            canvas.width = 128;
            canvas.height = 128;
            const context = canvas.getContext("2d");
            item.drawFullSizeOnCanvas(context, 128);
            this.element.appendChild(canvas);

            const detector = new ClickDetector(canvas, {});
            clickTrackers.push(detector);
            detector.click.add(() => {
                this.chosenItem = item;
                this.valueChosen.dispatch(item);
            });
        }
    }

    isValid() {
        return true;
    }

    getValue() {
        return null;
    }

    focus() {}
}
