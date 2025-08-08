function isDisplayed(node: JSX.JSXNode): node is Exclude<JSX.JSXNode, boolean | null | undefined> {
    return typeof node !== "boolean" && node != null;
}

/**
 * JSX factory.
 */
function jsx<T extends keyof JSX.IntrinsicElements>(tag: T, props: JSX.IntrinsicElements[T]): HTMLElement;
function jsx<U extends JSX.Props>(tag: JSX.Component<U>, props: U): Element;
function jsx<U extends JSX.Props>(
    tag: keyof JSX.IntrinsicElements | JSX.Component<U>,
    props: U
): JSX.Element {
    if (typeof tag === "function") return tag(props);

    const { children, ...attrs } = props as JSX.IntrinsicElements[keyof JSX.IntrinsicElements];

    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
        switch (typeof value) {
            case "boolean":
                if (!value) return;
                return element.setAttribute(key, "");
            case "number":
            case "string":
                return element.setAttribute(key, `${value}`);
        }
        throw new TypeError("JSX element attribute assigned invalid type");
    });
    element.append(...([children].flat(Infinity) as JSX.JSXNode[]).filter(isDisplayed));
    return element;
}

// functional component, called indirectly as `jsx(Fragment, props)`
/**
 * Groups elements without introducing a parent element.
 */
const Fragment = (props: JSX.Props) => props.children as JSX.Element;

// jsxs is used when there are multiple children
export { Fragment, jsx, jsx as jsxs };
