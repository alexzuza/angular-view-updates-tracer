export interface NodeBoundary {
    top: number;
    left: number;
    bottom: number;
    right: number;
    width: number;
    height: number;
    name: string;
    nodeName: string;
    level;
}

export interface NodePrefix {
    prefix: string;
    color: string;
    enabled: boolean;
    count?: number;
}

export interface NodeComponent {
    name: string;
    enabled: boolean;
    count?: number;
    color?: string;
}

let _enabled: boolean;
let _canvas = null;
let _canvasHover = null;
let listener;
let _cover = false;
let _nodes: NodeBoundary[];
let prefixes: NodePrefix[] = [];
let components: NodeComponent[] = [];

export function isAngular() {
    const isAngular = window['ng'] && !!window['Zone'];
    return {
        isAngular
    };
}

export function findPrefixes() {
    reset();
    const getAllAngularRootElements = window['getAllAngularRootElements']

    if (getAllAngularRootElements) {
        // console.log('findPrefixes: ', getAllAngularRootElements);
        _nodes = [];
        let rootEl = getAllAngularRootElements()[0];
        recurse(rootEl, 0, _nodes);
    }

    // console.log('findPrefixes prefixes:',  prefixes);

    components.sort((a, b) => a.name.localeCompare(b.name));

    return {
        prefixes,
        components
    };
}

function reset(): void {
    _nodes = [];
    prefixes = [];
    components = [];
}

function recurse(el, level, nodes: NodeBoundary[]) {
    const nodeBoundary = createNodeBoundary(el, level);
    if (nodeBoundary) {
        nodes.push(nodeBoundary);
    }

    el && el.childNodes && el.childNodes.forEach(n => recurse(n, level++, nodes));
}

const regexp = /([a-zA-Z]+)-([a-zA-Z]+)/i;

function createNodeBoundary(el, level): NodeBoundary | null  {

    const ng = window['ng'];
    // Angular 8.0.0
    // const probe = ng.probe(el);

    let hostElement;
    let component;

    try {
        hostElement = ng.getHostElement(el);
        component = ng.getComponent(el);
    } catch (e) {
    }

    if (hostElement && component) {
        const componentName = component.constructor.name;
        // A8
        // const nodeName = probe.nativeNode.nodeName;

        //A10
        const nodeName = hostElement.tagName.toLowerCase();

        const componentDescr = components.find(component => component.name === componentName)
        if (!componentDescr) {
            components.push({
                name: componentName,
                enabled: false,
                count: 1
            });
        } else {
            componentDescr.count += 1;
        }

        let groups = nodeName.match(regexp);
        if (groups && groups[1]) {
            const prefixDescr = prefixes.find(pref => pref.prefix === groups[1]);

            if (!prefixDescr) {
                prefixes.push({
                    prefix: groups[1],
                    color: 'red',
                    enabled: true,
                    count: 1
                });
            } else {
                prefixDescr.count += 1;
            }

            if (el.getBoundingClientRect) {
                const rect = el.getBoundingClientRect();
                return {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height,
                    name: componentName,
                    nodeName: nodeName,
                    level: level
                };
            }
        }
    }

    return null;
}

export function toggleCover(enabled: boolean) {
    _cover = enabled;
    clearCanvas(_canvas);
    _draw(_nodes);
}

export function togglePrefix(payload: { prefixes: NodePrefix[], components: NodeComponent[] }) {
    prefixes = payload.prefixes;
    components = payload.components;

    clearCanvas(_canvas);
    _draw(_nodes);
}

export function toggleTracing(toggle) {
    setEnabled(toggle.enabled);
    prefixes = toggle.prefixes;

    if (toggle.enabled) {
        _draw(_nodes);
        tooltip(_nodes);
    } else {
        clearCanvas(_canvas);
        document.body.removeEventListener('mousemove', listener);
    }
}

function setEnabled(enabled: boolean) {
    _enabled = enabled;
}

export function clear(): void {
    console.log('trace.ts: clear');
    clearCanvas(_canvas);
}

function clearCanvas(canvas): void {
    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
    }
}

function _draw(nodes: NodeBoundary[]): void {
    _canvas = ensureCanvas(_canvas, 'components', 99998);
    _canvasHover = ensureCanvas(_canvasHover, 'tooltip', 99999, 200, 50);
    const canvas = _canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (_cover) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    nodes && nodes.forEach(node => {
        drawBorder(ctx, node);
    });
}

export function drawBorder(ctx, boundary: NodeBoundary) {
    // outline
    ctx.lineWidth = 1;

    const nodePrefix = prefixes.find(prefix => boundary.nodeName && boundary.nodeName.startsWith(prefix.prefix));
    const component = components.find(component => boundary.name && boundary.name === component.name);

    const prefixMatches = nodePrefix && nodePrefix.enabled;
    const componentMatches = component && component.enabled;

    if (!prefixMatches && !componentMatches) {
        return;
    }

    const color = componentMatches ? (component && component.color) : (nodePrefix && nodePrefix.color) || 'blue';
    ctx.strokeStyle = color;

    ctx.strokeRect(boundary.left, boundary.top, boundary.width, boundary.height);

    if (boundary.name) {
        ctx.fillStyle = color;
        drawTextBG(ctx, boundary.name, boundary.left, boundary.top, color);
    }
}

function getCorrectTextColor(hex) {
    const threshold = 130;
    const hRed = hexToR(hex);
    const hGreen = hexToG(hex);
    const hBlue = hexToB(hex);

    function hexToR(h) {
        return parseInt((cutHex(h)).substring(0, 2), 16)
    }

    function hexToG(h) {
        return parseInt((cutHex(h)).substring(2, 4), 16)
    }

    function hexToB(h) {
        return parseInt((cutHex(h)).substring(4, 6), 16)
    }

    function cutHex(h) {
        return (h.charAt(0) == "#") ? h.substring(1, 7) : h
    }

    const cBrightness = ((hRed * 299) + (hGreen * 587) + (hBlue * 114)) / 1000;
    if (cBrightness > threshold) {
        return "#000000";
    } else {
        return "#ffffff";
    }
}

function drawTextBG(ctx, txt, x, y, style: string) {

    /// lets save current state as we make a lot of changes
    ctx.save();

    /// set font
    let font = ctx.font;

    /// draw text from top - makes life easier at the moment
    ctx.textBaseline = 'top';

    /// color for background
    ctx.fillStyle = style;

    /// get width of text
    var width = ctx.measureText(txt).width;

    /// draw background rect assuming height of font
    ctx.fillRect(x, y, width, parseInt(font, 10));

    /// text color
    ctx.fillStyle = getCorrectTextColor(style);

    /// draw text on top
    ctx.fillText(txt, x, y);

    /// restore original state
    ctx.restore();
}

function ensureCanvas(canvas, id, zIndex, width?, height?): void {
    if (canvas === null) {
        canvas = document.createElement('canvas');
        canvas.id = id;
        canvas.width = width || window.screen.availWidth;
        canvas.height = height || window.screen.availHeight;
        canvas.style.cssText = `position:fixed;top:0;right:0;bottom:0;left:0;z-index: ${zIndex};pointer-events:none;`;
    }

    document.body.insertBefore(canvas, document.body.firstChild);

    return canvas;
}

function tooltipListener(tooltipCanvas, nodes,  e) {
    let mouseX = e.clientX;
    let mouseY = e.clientY;

    let found: NodeBoundary;

    nodes && nodes.forEach(node => {
        if ((mouseX >= node.left)  &&  (mouseX <= node.right)  &&  (mouseY >= node.top)  &&  (mouseY <= node.bottom)) {
            found = found ? (found.level > node.level ? found: node) : node;
        }
    });

    if (found) {
        let ctx = (<any>tooltipCanvas).getContext('2d');
        ctx.clearRect(0, 0, (<any>tooltipCanvas).width, (<any>tooltipCanvas).height);
        ctx.fillText(found.name, 5, 15);
        tooltipCanvas.style.left = mouseX + "px";
        tooltipCanvas.style.top = mouseY + "px";
    }

}

function tooltip(nodes: NodeBoundary[]) {
    let tooltipCanvas = document.getElementById("tooltip");
    listener = tooltipListener.bind(this, tooltipCanvas, nodes);
    document.body.addEventListener('mousemove', listener);
}
