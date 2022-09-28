export interface FindPrefixesOptions {
  displayBlock: boolean;
}

export interface NodeBoundary {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
  name: string;
  nodeName: string;
  level: number;
  componentRef: any;
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
  onPush?: boolean;
  selectors?: string[];
}

export interface TogglePrefixesOptions {
  prefixes: NodePrefix[],
  components: NodeComponent[],
  textPosition: ComponentTextPosition,
  nameOrSelector: NameOrSelector
}

export interface ComponentTreeNode {
  id: string;
  name: string;
  parent: ComponentTreeNode;
  children: ComponentTreeNode[];
}

export type ComponentTextPosition = 'topLeft' | 'topRight';
export type NameOrSelector = 'name' | 'selector';

let _enabled: boolean;
let _canvas = null;
let _canvasHover = null;
let listener;
let _cover = false;
let _nodes: NodeBoundary[];
let prefixes: NodePrefix[] = [];
let components: NodeComponent[] = [];
let position: ComponentTextPosition = 'topLeft';
let nameOrSelector: NameOrSelector = 'selector';
let extensionDebugLogEnabled = false;
const ng = window['ng'];

const originalDisplay = new Map<string, string>();

export function isAngular() {
  const isAngular = window['ng'] && !!window['Zone'];
  return {
    isAngular
  };
}

export function findPrefixes(options: FindPrefixesOptions) {
  // debug('Find prefixes', options);
  reset();
  let rootEl = document.querySelector('body');


  // let treeNodeRoot: ComponentTreeNode = {
  //
  // };
  recurse(rootEl, 0, _nodes, options, null);

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

function recurse(el: ChildNode, level: number, nodes: NodeBoundary[], options: FindPrefixesOptions, parent: ComponentTreeNode) {
  createNodeBoundary(el, level, nodes, options);

  el && el.childNodes && el.childNodes.forEach(n => recurse(n, level++, nodes, options, null));
}

const regexp = /([a-zA-Z]+)-([a-zA-Z]+)/i;

function createNodeBoundary(el: ChildNode, level: number, nodes: NodeBoundary[], options: FindPrefixesOptions): NodeBoundary | null  {
  let hostElement: HTMLElement;
  let component;

  try {
    hostElement = ng.getHostElement(el);
    component = ng.getComponent(el);
  } catch (e) {
  }

  if (hostElement && component) {
    const componentDef = component.constructor.ɵcmp;
    const componentId = componentDef.id;

    const componentName = component.constructor.name;
    const tageName = hostElement.tagName.toLowerCase();

    handleDisplayBlock(options.displayBlock, componentId, hostElement);

    handleComponent(componentName, componentDef);
    handlePrefix(tageName);
    handleNodeBoundary(el, componentName, tageName, level, component, nodes);

    // TODO return treeNode
  }

  return null;
}

function handleComponent(componentName: string, componentDef): void {
  const componentDescr = components.find(component => component.name === componentName)
  if (!componentDescr) {
    components.push({
      name: componentName,
      onPush: componentDef.onPush,
      selectors: componentDef.selectors,
      enabled: false,
      count: 1
    });
  } else {
    componentDescr.count += 1;
  }
}

function handlePrefix(tageName: string): void {
  let groups = tageName.match(regexp);
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
  }
}

function handleNodeBoundary(el, componentName: string, tageName: string, level: number, component: any, nodes: NodeBoundary[]): void {
  if (el.getBoundingClientRect) {
    const rect = el.getBoundingClientRect();
    const node = {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      name: componentName,
      nodeName: tageName,
      level: level,
      componentRef: component
    };

    nodes.push(node);
  }
}

export function toggleCover(enabled: boolean) {
  _cover = enabled;
  clearCanvas(_canvas);
  _draw(_nodes);
}

export function togglePrefix(payload: { prefixes: NodePrefix[], components: NodeComponent[], textPosition: ComponentTextPosition, nameOrSelector: NameOrSelector }) {
  prefixes = payload.prefixes;
  components = payload.components;
  position = payload.textPosition;
  nameOrSelector = payload.nameOrSelector;

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
  // debug('trace.ts: clear');
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
  _canvasHover = ensureCanvas(_canvasHover, 'tooltip', 99999, 700, 700);
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
    drawTextBG(ctx, nameOrSelector === 'selector' ? boundary.nodeName : boundary.name, boundary.left, boundary.top, boundary.width, boundary.height, color);
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

function drawTextBG(ctx, txt, componentX, componentY, componentWidth, componentHeight, style: string) {

  /// lets save current state as we make a lot of changes
  ctx.save();

  /// set font
  // let font = ctx.font;
  ctx.font = "14px Arial";
  let font = ctx.font;

  /// draw text from top - makes life easier at the moment
  ctx.textBaseline = 'top';

  /// color for background
  ctx.fillStyle = style;

  /// get componentWidth of text
  let textDimensions = ctx.measureText(txt);

  let p = computeByStrategy(componentX, componentY, componentWidth, textDimensions.width, font);

  /// draw background rect assuming height of font
  ctx.fillRect(p.x, p.y, p.width, p.height);

  /// text color
  ctx.fillStyle = getCorrectTextColor(style);

  /// draw text on top
  ctx.fillText(txt, p.x, p.y);

  /// restore original state
  ctx.restore();
}

function computeByStrategy(x, y, componentWidth, textWidth, font): { x: number, y: number, width: number, height: number } {
  switch (position) {
    case 'topRight':
      return {
        x: x + componentWidth - textWidth,
        y: y,
        width: textWidth,
        height: parseInt(font, 10)
      }
    case 'topLeft':
    default:
      return {
        x: x,
        y: y,
        width: textWidth,
        height: parseInt(font, 10)
      }
  }
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

function getComponentInstanceInfoCmp(component: any): string[] {
  const detail = component.constructor.ɵcmp;
  return [
    `id: ${detail.id}`,
    `exportAs: ${detail.exportAs}`,
    `onPush: ${detail.onPush}`,
    `standalone: ${detail.standalone}`,
    `selector: ${detail.selectors.join(' ')}`,
    `inputs: ${Object.keys(detail.inputs).map((key) => `${key} = ${JSON.stringify(component[key])}`)}`,
    `outputs: ${Object.keys(detail.outputs).map((key) => `${key}`)}`,
  ];
}

function getComponentInstanceInfo(found: NodeBoundary): string[] {
  const component = found.componentRef;
  // const detail = component.constructor.ɵcmp;

  const result = [
    `name: ${found.name}`,
    ...getComponentInstanceInfoCmp(found.componentRef)
  ];

  // const directives = detail.directiveDefs && detail.directiveDefs();
  //
  // if (directives && directives.length) {
  //     directives
  //       .map(dir => getComponentInstanceInfoCmp(dir))
  //       .reduce((acc, current) => [...acc, ...current], result)
  // }

  return result;
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

    getComponentInstanceInfo(found).forEach((text, i) => ctx.fillText(text, 40, (i + 1) * 15));
    tooltipCanvas.style.left = mouseX + "px";
    tooltipCanvas.style.top = mouseY + "px";
  }

}

function tooltip(nodes: NodeBoundary[]) {
  let tooltipCanvas = document.getElementById("tooltip");
  listener = tooltipListener.bind(this, tooltipCanvas, nodes);
  document.body.addEventListener('mousemove', listener);
}

function debug(...args): void {
  if (extensionDebugLogEnabled) {
    console.log(...args);
  }
}

function handleDisplayBlock(displayBlock: boolean, componentId: string, hostElement): void {
  // display block 1) this is initialization phase - remember display values for all outlined components
  if (displayBlock && !hostElement.style.display) {
    originalDisplay.set(componentId, hostElement.style.display);
    hostElement.style.display = 'block';
  }

  // display block 2) this is when user clicks toggle display block - restore display (second and next rerender)
  if (!displayBlock && originalDisplay.has(componentId)) {
    hostElement.style.display = originalDisplay.get(componentId);
  }
}
