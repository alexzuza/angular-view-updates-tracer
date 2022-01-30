import { NodeComponent, NodePrefix } from './tracer/trace';

let storedPrefixes: NodePrefix[];
let storedComponents: NodeComponent[];

const sortByNameFn = (a: NodeComponent, b: NodeComponent) => a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase());
const sortByCountFn = (a: NodeComponent, b: NodeComponent) => b.count - a.count;

let currentSortFn: (a: NodeComponent, b: NodeComponent) => number = sortByNameFn;

function onDOMContentLoaded() {
    const traceSwitcherCbx = document.getElementById('traceSwitcherCbx') as HTMLInputElement;
    const switcherCoverCbx = document.getElementById('switcherCoverCbx') as HTMLInputElement;
    const errorElem = document.getElementById('error');
    const switcherElem = document.getElementById('switcher');

    // chrome.storage.local.get('ngTraceEnabled', ({ ngTraceEnabled }) => {
    //     traceSwitcherCbx.checked = !!ngTraceEnabled;
    //     switcherElem.scrollHeight;
    //     switcherElem.classList.add('loaded');
    // });
    traceSwitcherCbx.addEventListener('change', e => {
        const enabled = (<HTMLInputElement>e.target).checked;
        // console.log('popup.ts traceSwitcherCbx enabled: ', enabled);

        chrome.storage.local.set({ ngTraceEnabled: enabled });
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'toggleTracing',
                payload: {
                    enabled,
                    prefixes: createPrefixes()
                }
            });
        });
    });

    switcherCoverCbx.addEventListener('change', e => {
        const enabled = (<HTMLInputElement>e.target).checked;
        chrome.storage.local.set({ ngTraceCoverEnabled: enabled });
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'toggleCover',
                payload: enabled
            });
        });
    });

    function createPrefixes(): NodePrefix[] {
        const inputs: NodeListOf<HTMLInputElement> = document.querySelectorAll('input[data-prefix][type=checkbox]');
        return Array.from(inputs).map(input => {
            let prefix = input.getAttribute('data-prefix');
            let inputColorEl: HTMLInputElement = document.querySelector(`input[data-prefix=${prefix}][type=text]`);
            let color = inputColorEl && inputColorEl.value || 'red';
            let enabled = input.checked;
            return {
                prefix,
                color,
                enabled
            };
        });
    }

    function createComponents(): NodeComponent[] {
        const inputs: NodeListOf<HTMLInputElement> = document.querySelectorAll('input[data-component][type=checkbox]');
        return Array.from(inputs).map(input => {
            let componentName = input.getAttribute('data-component');
            let inputColorEl: HTMLInputElement = document.querySelector(`input[data-component=${componentName}][type=text]`);
            let color = inputColorEl && inputColorEl.value || 'red';
            let enabled = input.checked;
            return {
                name: componentName,
                enabled,
                color
            };
        });
    }

    function updateUi() {
        const prefixes = createPrefixes();
        const components = createComponents();

        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                type: 'togglePrefix',
                payload: { prefixes, components }
            });
        });
    }

    const changeColor = function(prefixes: NodePrefix[], prefix: string, el: HTMLDivElement, event) {
        const value = event.target.value;
        prefixes.forEach(pref => {
            if (value.match(/^#(?:[0-9a-fA-F]{3}){1,2}$/)) {
                el.style.backgroundColor = value;
                if (pref.prefix === prefix) {
                    pref.color = value;
                    updateUi();
                }
            }
        });
    };

    const colors = ['#f3d1dc', '#89aeb2', '#f1e0b0', '#fdcf76', '#d2a3a9', '#c1cd97'];

    const randomColorFn: () => string = () => `#${Math.floor(Math.random()*16777215).toString(16)}`;

    function removeComponents(): void {
        let divComponents = document.getElementById('components');
        while (divComponents.firstChild) {
            divComponents.removeChild(divComponents.lastChild);
        }
    }

    function buildPopup(prefixes: NodePrefix[], components: NodeComponent[]) {
        let divPrefixes = document.getElementById('prefixes');
        let divComponents = document.getElementById('components');
        let container = document.getElementById('container');
        let componentFilterInput = document.getElementById('componentFilter') as HTMLInputElement;
        let sortByName = document.getElementById('sortByName');
        let sortByCount = document.getElementById('sortByCount');
        let toggleSelectAllComponents = document.getElementById('toggleSelectAllComponents') as HTMLInputElement;


        toggleSelectAllComponents.addEventListener('click', () => {
            updateComponents(divComponents, componentFilterInput.value, toggleSelectAllComponents.checked);
        });

        sortByName.addEventListener('click', () => {
            currentSortFn = sortByNameFn;
            sortByName.classList.add('bold');
            sortByCount.classList.remove('bold');
            updateComponents(divComponents, componentFilterInput.value, null);
        });

        sortByCount.addEventListener('click', () => {
            currentSortFn = sortByCountFn;
            sortByCount.classList.add('bold');
            sortByName.classList.remove('bold');
            updateComponents(divComponents, componentFilterInput.value, null);
        });

        if (prefixes.length || components.length) {
            container.style.display = 'initial';
        }

        componentFilterInput.addEventListener('input', () => {
           updateComponents(divComponents, componentFilterInput.value, null);
        });

        createPrefixesInputs(prefixes).forEach(prefix => divPrefixes.appendChild(prefix));
        createComponentInputs(components).forEach(component => divComponents.appendChild(component));
    }

    function updateComponents(divComponents: HTMLElement, filterText: string, masterCheckBox: boolean): void {
        removeComponents();
        createComponentInputs(storedComponents,
          filterText
            ? name => !!name.match(new RegExp(filterText))
            : null,
          currentSortFn,
          masterCheckBox
        ).forEach(component => divComponents.appendChild(component));
        updateUi();
    }

    function createPrefixesInputs(prefixes: NodePrefix[]): HTMLDivElement[] {
        return prefixes.map((prefix, i) => {
            const mainDiv: HTMLDivElement = document.createElement('div');
            const color = colors[i] || randomColorFn();
            mainDiv.classList.add('prefixes__pref');
            mainDiv.style.backgroundColor = color;

            const id = `pref-${prefix.prefix}`;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.textContent = `${prefix.prefix} (${prefix.count})`;

            const prefixCb = document.createElement('input');
            prefixCb.id = id;
            prefixCb.type = 'checkbox';
            prefixCb.addEventListener('change', updateUi);
            prefixCb.dataset.prefix = prefix.prefix;
            prefixCb.checked = false;

            const inputId = `input-${prefix.prefix}`;
            const inputColor = document.createElement('input');
            inputColor.id = inputId;
            inputColor.type = 'text';
            inputColor.dataset.prefix = prefix.prefix;
            inputColor.value = color;

            inputColor.addEventListener('input', changeColor.bind(inputColor, prefixes, prefix.prefix, mainDiv));

            mainDiv.appendChild(prefixCb);
            mainDiv.appendChild(label);
            mainDiv.appendChild(inputColor);

            return mainDiv;
        })
    }

    function createComponentInputs(
      components: NodeComponent[],
      filter?: (name: string) => boolean,
      sort?: (a: NodeComponent, b: NodeComponent) => number,
      masterCheckBox?: boolean | undefined
    ): HTMLDivElement[] {
        // console.log(`filter: ${filter}`); TODO

        return components
          .filter(component => !filter || (filter && filter(component.name)))
          .sort(sort || sortByNameFn)
          .map((component, i) => {
              const mainDiv: HTMLDivElement = document.createElement('div');
              const color = colors[i] || randomColorFn();
              mainDiv.classList.add('components__pref');
              mainDiv.style.backgroundColor = color;

              const id = `pref-${component.name}`;
              const label = document.createElement('label');
              label.htmlFor = id;
              console.log('AAA ', component);
              label.textContent = `${component.name} (${component.count})`;

              const changeDetectionEl = document.createElement('span');
              changeDetectionEl.textContent = `${component.onPush ? 'OnPush' : 'Default'}`;

              const prefixCb = document.createElement('input');
              prefixCb.id = id;
              prefixCb.type = 'checkbox';
              prefixCb.addEventListener('change', updateUi);
              prefixCb.dataset.component = component.name;

              if (masterCheckBox === false || masterCheckBox === true) {
                  prefixCb.checked = masterCheckBox;
              } else {
                prefixCb.checked = !!filter && filter(component.name);
              }

              const inputId = `input-${component.name}`;
              const inputColor = document.createElement('input');
              inputColor.id = inputId;
              inputColor.type = 'text';
              inputColor.dataset.component = component.name;
              inputColor.value = color;

              // inputColor.addEventListener('input', inputHandler.bind(inputColor, component.name)); // TODO ?

              mainDiv.appendChild(prefixCb);
              mainDiv.appendChild(label);
              mainDiv.appendChild(changeDetectionEl);
              mainDiv.appendChild(inputColor);
              return mainDiv;
          })
    }

    function sendMessageToFindPrefixes(id) {
        chrome.tabs.sendMessage(
          id,
          {
              type: 'findPrefixes'
          },
          ({ prefixes, components }) => {
              if (prefixes && prefixes.length) {
                  storedComponents = components;
                  storedPrefixes = prefixes;
                  buildPopup(prefixes, components);
                  updateUi(); // draw component on popup open
              }
          }
        );
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
              type: 'isAngular'
          },
          ({ isAngular }) => {
              if (isAngular) {
                  sendMessageToFindPrefixes(tabs[0].id);
              } else {
                  switcherElem.style.display = 'none';
                  errorElem.innerHTML = `This page doesn't appear to be using Angular.`;
              }
          }
        );
    });
}

function unload() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: 'clear'
        });
    });
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
document.addEventListener('beforeunload ', unload);
