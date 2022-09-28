import { isAngular, toggleTracing, toggleCover, togglePrefix, findPrefixes, clear } from './trace';

function handleMessage(e: MessageEvent) {
  if (!e.data || !Array.isArray(e.data)) {
    return;
  }
  const [id, data] = e.data;

  if (!data || data.type !== 'content_script' || !HANDLERS[data.action]) {
    return;
  }

  const result = HANDLERS[data.action](data.payload);

  const messageToSend = [
    id,
    {
      type: 'tracer',
      payload: result
    }
  ];
  postMessage(messageToSend, '*');
}

const HANDLERS = {
  togglePrefix: prefixes => togglePrefix(prefixes),
  toggleCover: enable => toggleCover(enable),
  toggleTracing: enable => toggleTracing(enable),
  isAngular: () => isAngular(),
  findPrefixes: options => findPrefixes(options),
  clear: () => clear()
};

window.addEventListener('message', handleMessage);
