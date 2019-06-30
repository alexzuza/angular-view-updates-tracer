let uniqueId = 1;

export function promisePostMessage() {
  const messageHandlers: {
    [key: string]: (result: any, error: any) => void;
  } = {};

  function onMessage(message: MessageEvent) {
    if (!Array.isArray(message.data)) {
      return;
    }
    const [messageId, result, error] = message.data;

    const handler = messageHandlers[messageId];

    if (!handler || !result || result.type !== 'tracer') {
      return;
    }

    handler(result.payload, error);
    delete messageHandlers[messageId];
  }

  window.addEventListener('message', onMessage);

  return {
    postMessage: (action: string, message?: any): Promise<any> => {
      const id = uniqueId++;
      const messageToSend = [
        id,
        {
          type: 'content_script',
          action,
          payload: message
        }
      ];

      return new Promise((resolve, reject) => {
        messageHandlers[id] = (result, error) => {
          if (error) {
            reject(new Error(error));
          }

          resolve(result);
        };

        window.postMessage(messageToSend, '*');
      });
    }
  };
}
