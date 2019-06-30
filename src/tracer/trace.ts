import { asElementData, patchViews, setEnabled, setUpdateHandler } from './view';
import { TraceRenderer } from './trace-renderer';
import { calculateNodeBoundary } from './utils';

let ng = window['ng'];
let Zone = window['Zone'];

export function isAngular() {
  return ng && !!Zone;
}

export function toggleTracing(enabled: boolean) {
  setEnabled(enabled);

  if (enabled) {
    const originalTick = ng.coreTokens.ApplicationRef.prototype.tick;
    if (originalTick.__patched__) {
      return;
    }

    ng.coreTokens.ApplicationRef.prototype.tick = function() {
      const result = originalTick.apply(this, arguments);
      patchViews(this._views);
      this._views[0].checkNoChanges();
      return result;
    };
    ng.coreTokens.ApplicationRef.prototype.tick.__patched__ = originalTick;

    setUpdateHandler(draw);
  } else if (ng.coreTokens.ApplicationRef.prototype.tick.__patched__) {
    ng.coreTokens.ApplicationRef.prototype.tick = ng.coreTokens.ApplicationRef.prototype.tick.__patched__;
    nodes.clear();
    renderer.clear();
  }
}

const nodes = new Map();
const renderer = new TraceRenderer();

function draw(view) {
  view.def.nodes
    .filter(nodeDef => (nodeDef.flags & 201347067 /* Types */) === 1) // TypeElement
    .forEach(nodeDef => {
      const elData = asElementData(view, nodeDef.nodeIndex);
      const renderNode = elData.renderElement;
      if (!renderNode || !renderNode.getBoundingClientRect) {
        return;
      }

      let node;
      if (!nodes.has(renderNode)) {
        node = calculateNodeBoundary(renderNode);
        nodes.set(renderNode, node);
      } else {
        node = nodes.get(renderNode);
      }

      Zone.root.run(() => {
        renderer.present(node);
      });
    });
}
