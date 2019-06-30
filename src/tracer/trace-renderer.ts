import { drawBorder } from './utils';
import { NodeBoundary, NodeMeta } from './types';

const DELAY = 300;

const COLORS = ['#55cef6', '#55f67b', '#a5f655', '#f4f655', '#f6a555', '#f66855', '#ff0000'];

const HOTTEST_COLOR = COLORS[COLORS.length - 1];

export class TraceRenderer {
  private _canvas = null;

  private _clearTimer = null;

  private _isDrawing = false;

  private _nodes: Map<NodeBoundary, NodeMeta> = new Map();

  present(node: NodeBoundary): void {
    let data;
    if (this._nodes.has(node)) {
      data = this._nodes.get(node);
    } else {
      data = { expiration: 0, hit: 0 };
    }

    Object.assign(data, {
      expiration: Date.now() + DELAY,
      hit: data.hit + 1
    });

    this._nodes.set(node, data);

    if (this._isDrawing) {
      return;
    }

    this._isDrawing = true;
    requestAnimationFrame(this._draw);
  }

  clear(): void {
    const canvas = this._canvas;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.parentNode.removeChild(canvas);
    this._canvas = null;
  }

  private _redraw = () => {
    this._clearTimer = null;
    if (!this._isDrawing && this._nodes.size > 0) {
      this._isDrawing = true;
      this._draw();
    }
  };

  private _draw = () => {
    const now = Date.now();
    let minExpirationDate = Number.MAX_VALUE;

    for (const [node, meta] of this._nodes.entries()) {
      if (meta.expiration < now) {
        // already passed the expiration time.
        this._nodes.delete(node);
      } else {
        minExpirationDate = Math.min(meta.expiration, minExpirationDate);
      }
    }

    this._doDraw(this._nodes);

    if (this._nodes.size > 0) {
      if (this._clearTimer != null) {
        clearTimeout(this._clearTimer);
      }
      this._clearTimer = setTimeout(this._redraw, minExpirationDate - now);
    }

    this._isDrawing = false;
  };

  private _doDraw(nodes: Map<NodeBoundary, NodeMeta>): void {
    this._ensureCanvas();
    const canvas = this._canvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const [node, meta] of nodes.entries()) {
      const color = COLORS[meta.hit - 1] || HOTTEST_COLOR;
      drawBorder(ctx, node, 1, color);
    }
  }

  private _ensureCanvas(): void {
    let canvas = this._canvas;
    if (canvas === null) {
      canvas = document.createElement('canvas');
      canvas.width = window.screen.availWidth;
      canvas.height = window.screen.availHeight;
      canvas.style.cssText = `position:fixed;top:0;right:0;bottom:0;left:0;pointer-events:none;z-index: 99999;`;
    }

    document.body.insertBefore(canvas, document.body.firstChild);

    this._canvas = canvas;
  }
}
