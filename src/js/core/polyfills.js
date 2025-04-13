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

function domPolyfills() {
    // from:https://github.com/jserz/js_piece/blob/master/DOM/ChildNode/remove()/remove().md
    (function (arr) {
        arr.forEach(function (item) {
            if (Object.hasOwn(item, "remove")) {
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

function initPolyfills() {
    mathPolyfills();
    domPolyfills();
}

// Other polyfills
initPolyfills();
