let updateHandler: (view) => void;
let traceEnabled = false;

function traverseView(view) {
  if ([view.def.updateRenderer, view.def.updateDirectives].join().includes(',')) {
    const originalUpdateRenderer = view.def.updateRenderer;
    if (!view.def.updateRenderer.__patched__) {
      view.def.updateRenderer = function(check, view) {
        if (traceEnabled && typeof updateHandler === 'function') {
          updateHandler(view);
        }
        if (!traceEnabled) {
          view.def.updateRenderer = view.def.updateRenderer.__patched__;
        }

        return originalUpdateRenderer.apply(this, arguments);
      };
      view.def.updateRenderer.__patched__ = originalUpdateRenderer;
    }
  }

  traverseEmbeddedViews(view);
  traverseComponentViews(view);
}

function traverseEmbeddedViews(view) {
  const def = view.def;
  if (!(def.nodeFlags & 16777216) /* EmbeddedViews */) {
    return;
  }
  for (let i = 0; i < def.nodes.length; i++) {
    const nodeDef = def.nodes[i];
    if (nodeDef.flags & 16777216 /* EmbeddedViews */) {
      // a leaf
      const embeddedViews = asElementData(view, i).viewContainer._embeddedViews;
      for (let k = 0; k < embeddedViews.length; k++) {
        traverseView(embeddedViews[k]);
      }
    } else if ((nodeDef.childFlags & 16777216) /* EmbeddedViews */ === 0) {
      // a parent with leafs
      // no child is a component,
      // then skip the children
      i += nodeDef.childCount;
    }
  }
}

function traverseComponentViews(view) {
  const def = view.def;
  if (!(def.nodeFlags & 33554432) /* ComponentView */) {
    return;
  }
  for (let i = 0; i < def.nodes.length; i++) {
    const nodeDef = def.nodes[i];
    if (nodeDef.flags & 33554432 /* ComponentView */) {
      // a leaf
      traverseView(asElementData(view, i).componentView);
    } else if ((nodeDef.childFlags & 33554432) /* ComponentView */ === 0) {
      // a parent with leafs
      // no child is a component,
      // then skip the children
      i += nodeDef.childCount;
    }
  }
}

export function asElementData(view, index) {
  return view.nodes[index];
}

export function setUpdateHandler(handler: (view) => void) {
  updateHandler = handler;
}

export function setEnabled(enabled: boolean) {
  traceEnabled = enabled;
}

export function patchViews(views) {
  for (const view of views) {
    traverseView(view._view);
  }
}
