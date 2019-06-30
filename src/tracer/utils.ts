import { NodeBoundary } from './types';

export function calculateNodeBoundary(node): NodeBoundary {
  const rect = node.getBoundingClientRect();

  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width
  };
}

const OUTLINE_COLOR = '#f0f0f0';

export function drawBorder(ctx, boundary: NodeBoundary, borderWidth, borderColor) {
  // outline
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE_COLOR;

  ctx.strokeRect(boundary.left - 1, boundary.top - 1, boundary.width + 2, boundary.height + 2);

  // inset
  ctx.lineWidth = 1;
  ctx.strokeStyle = OUTLINE_COLOR;
  ctx.strokeRect(
    boundary.left + borderWidth,
    boundary.top + borderWidth,
    boundary.width - borderWidth,
    boundary.height - borderWidth
  );
  ctx.strokeStyle = borderColor;

  ctx.setLineDash([0]);

  // border
  ctx.lineWidth = '' + borderWidth;
  ctx.strokeRect(
    boundary.left + Math.floor(borderWidth / 2),
    boundary.top + Math.floor(borderWidth / 2),
    boundary.width - borderWidth,
    boundary.height - borderWidth
  );

  ctx.setLineDash([0]);
}
