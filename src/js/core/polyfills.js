function mathPolyfills() {
    // Converts from degrees to radians.
    Math.radians = function (degrees) {
        return (degrees * Math.PI) / 180.0;
    };

    // Converts from radians to degrees.
    Math.degrees = function (radians) {
        return (radians * 180.0) / Math.PI;
    };
}

function stringPolyfills() {
    // https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength, padString) {
            targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
            padString = String(typeof padString !== "undefined" ? padString : " ");
            if (this.length >= targetLength) {
                return String(this);
            } else {
                targetLength = targetLength - this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
                }
                return padString.slice(0, targetLength) + String(this);
            }
        };
    }

    // https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padEnd
    if (!String.prototype.padEnd) {
        String.prototype.padEnd = function padEnd(targetLength, padString) {
            targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
            padString = String(typeof padString !== "undefined" ? padString : " ");
            if (this.length > targetLength) {
                return String(this);
            } else {
                targetLength = targetLength - this.length;
                if (targetLength > padString.length) {
                    padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
                }
                return String(this) + padString.slice(0, targetLength);
            }
        };
    }
}

function objectPolyfills() {
    // https://github.com/tc39/proposal-object-values-entries/blob/master/polyfill.js

    // @ts-ignore
    const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
    // @ts-ignore
    const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
    // @ts-ignore
    const concat = Function.bind.call(Function.call, Array.prototype.concat);
    const keys = Reflect.ownKeys;

    // @ts-ignore
    if (!Object.values) {
        // @ts-ignore
        Object.values = function values(O) {
            return reduce(
                keys(O),
                (v, k) => concat(v, typeof k === "string" && isEnumerable(O, k) ? [O[k]] : []),
                []
            );
        };
    }

    if (!Object.entries) {
        // @ts-ignore
        Object.entries = function entries(O) {
            return reduce(
                keys(O),
                (e, k) => concat(e, typeof k === "string" && isEnumerable(O, k) ? [[k, O[k]]] : []),
                []
            );
        };
    }
}

function domPolyfills() {
    // from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
    (function (arr) {
        arr.forEach(function (item) {
            if (item.hasOwnProperty("remove")) {
                return;
            }
            Object.defineProperty(item, "remove", {
                configurable: true,
                enumerable: true,
                writable: true,
                value: function remove() {
                    this.parentNode.removeChild(this);
                },
            });
        });
    })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
}

function JSXPolyfills() {
    // https://betterprogramming.pub/how-to-use-jsx-without-react-21d23346e5dc
    const appendChild = (parent, child) => {
        if (Array.isArray(child)) child.forEach(nestedChild => appendChild(parent, nestedChild));
        else parent.appendChild(child.nodeType ? child : document.createTextNode(child));
    };

    window.JSXCreateElement = (tag, props, ...children) => {
        if (typeof tag === "function") return tag(props, children);

        const element = document.createElement(tag);

        Object.entries(props || {}).forEach(([name, value]) => {
            if (name.startsWith("on") && name.toLowerCase() in window)
                element.addEventListener(name.toLowerCase().substring(2), value);
            else element.setAttribute(name, value.toString());
        });

        children.forEach(child => {
            appendChild(element, child);
        });

        return element;
    };

    window.JSXCreateFragment = (props, ...children) => {
        return children;
    };
}

function initPolyfills() {
    mathPolyfills();
    stringPolyfills();
    objectPolyfills();
    domPolyfills();
    JSXPolyfills();
}

function initExtensions() {
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
    };
}

// Other polyfills
initPolyfills();
initExtensions();
