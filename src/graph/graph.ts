import { ComponentTreeNode } from '../tracer/trace';

interface StackItem {
  parent: ComponentTreeNode;
  child: ComponentTreeNode;
  level: number;
}

const SEPARATOR = '\n';
let stack = [];
const FLOWCHART = [
  '[Mermaid](https://mermaid-js.github.io/mermaid/#/flowchart?id=graph)',
  '```mermaid',
  'flowchart TD',
  'PLACEHOLDER', // TO BE INSERTED HERE
  '```'
];

export function buildGraph(node: ComponentTreeNode): string {
  const result = [...FLOWCHART];
  result[FLOWCHART.findIndex(item => item === 'PLACEHOLDER')] = flatten(node)
    .map(stackItem => createRelationship(stackItem))
    .join(SEPARATOR);

  return result.join(SEPARATOR);
}

export function flatten(node: ComponentTreeNode, level = 0): StackItem[] {
  if (node && node.children?.length) {
    node.children
      .forEach(child => {
        if (node.name !== 'root') { // TODO fix in trace.js
          stack.push({ parent: node, child, level });
        }
        flatten(child, level + 1);
      })
  }

  return stack;
}

function createRelationship({ parent, child, level }) {
  return `${new Array(level).join(' ')}${parent.name}-->${child.name}`
}

