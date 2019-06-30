import { promisePostMessage } from './promised-postmessage';

const promisedPostMessage = promisePostMessage();

const script = document.createElement('script');
script.src = chrome.extension.getURL('js/tracer.js');
document.body.appendChild(script);
script.onload = async () => {
  const isAngular = await HANDLERS.isAngular();
  if (!isAngular) {
    return;
  }
  chrome.storage.local.get('ngTraceEnabled', ({ ngTraceEnabled }) => {
    HANDLERS.toggle(!!ngTraceEnabled);
  });
};

const HANDLERS = {
  isAngular: () => promisedPostMessage.postMessage('isAngular'),
  toggle: enable => promisedPostMessage.postMessage('toggle', enable)
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (HANDLERS[msg.type]) {
    HANDLERS[msg.type](msg.payload).then(result => {
      sendResponse(result);
    });

    return true;
  }
});
