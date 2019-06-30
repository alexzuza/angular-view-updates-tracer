import { isAngular, toggleTracing } from './trace';

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
  toggle: enable => toggleTracing(enable),
  isAngular: () => isAngular()
};

window.addEventListener('message', handleMessage);
