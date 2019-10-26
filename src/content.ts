import { promisePostMessage } from './promised-postmessage';
import { toggleTracing } from './tracer/trace';

const promisedPostMessage = promisePostMessage();

const script = document.createElement('script');
script.src = chrome.extension.getURL('js/tracer.js');
document.body.appendChild(script);
script.onload = async () => {
  const isAngular = await HANDLERS.isAngular();
  if (!isAngular) {
    return;
  }
  // chrome.storage.local.get('ngTraceCoverEnabled', ({ ngTraceCoverEnabled }) => {
  //   HANDLERS.toggleCover(!!ngTraceCoverEnabled);
  // });
  // chrome.storage.local.get('ngTraceEnabled', ({ ngTraceEnabled }) => {
  //   HANDLERS.toggle(!!ngTraceEnabled);
  // });
};

const HANDLERS = {
  isAngular: () => promisedPostMessage.postMessage('isAngular'),
  findPrefixes: () => promisedPostMessage.postMessage('findPrefixes'),
  toggleCover: enable => promisedPostMessage.postMessage('toggleCover', enable),
  toggleTracing: enable => promisedPostMessage.postMessage('toggleTracing', enable),
  togglePrefix: prefixes => promisedPostMessage.postMessage('togglePrefix', prefixes),
  clear: () => promisedPostMessage.postMessage('clear')
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (HANDLERS[msg.type]) {
    HANDLERS[msg.type](msg.payload).then(result => {
      sendResponse(result);
    });
    return true;
  }
});
