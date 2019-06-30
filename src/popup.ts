function onDOMContentLoaded() {
  const traceSwitcherCbx = document.getElementById('traceSwitcherCbx') as HTMLInputElement;
  const errorElem = document.getElementById('error');
  const switcherElem = document.getElementById('switcher');

  chrome.storage.local.get('ngTraceEnabled', ({ ngTraceEnabled }) => {
    traceSwitcherCbx.checked = !!ngTraceEnabled;
    switcherElem.scrollHeight;
    switcherElem.classList.add('loaded');
  });
  traceSwitcherCbx.addEventListener('change', e => {
    const enabled = (<HTMLInputElement>e.target).checked;
    chrome.storage.local.set({ ngTraceEnabled: enabled });
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'toggle',
        payload: enabled
      });
    });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      {
        type: 'isAngular'
      },
      result => {
        if (!result) {
          switcherElem.style.display = 'none';
          errorElem.innerHTML = `This page doesn't appear to be using Angular.`;
        }
      }
    );
  });
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
