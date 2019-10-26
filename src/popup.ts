import { NodeComponent, NodePrefix } from './tracer/trace';

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
        const prefixes: NodePrefix[] = Array.from(inputs).map(input => {
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
        return prefixes;
    }

    function createComponents(): NodeComponent[] {
        const inputs: NodeListOf<HTMLInputElement> = document.querySelectorAll('input[data-component][type=checkbox]');
        const components: NodeComponent[] = Array.from(inputs).map(input => {
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
        return components;
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

    function buildPopup(prefixes: NodePrefix[], components: NodeComponent[]) {
        let divPrefixes = document.getElementById('prefixes');
        let divComponents = document.getElementById('components');
        prefixes.forEach((prefix, i) => {
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
            prefixCb.checked = true;

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

            divPrefixes.appendChild(mainDiv);
        });

        components.forEach((component, i) => {
            const mainDiv: HTMLDivElement = document.createElement('div');
            const color = colors[i] || randomColorFn();
            mainDiv.classList.add('prefixes__pref');
            mainDiv.style.backgroundColor = color;

            const id = `pref-${component.name}`;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.textContent = `${component.name} (${component.count})`;

            const prefixCb = document.createElement('input');
            prefixCb.id = id;
            prefixCb.type = 'checkbox';
            prefixCb.addEventListener('change', updateUi);
            prefixCb.dataset.component = component.name;
            prefixCb.checked = false;

            const inputId = `input-${component.name}`;
            const inputColor = document.createElement('input');
            inputColor.id = inputId;
            inputColor.type = 'text';
            inputColor.dataset.component = component.name;
            inputColor.value = color;

            // inputColor.addEventListener('input', inputHandler.bind(inputColor, component.name));

            mainDiv.appendChild(prefixCb);
            mainDiv.appendChild(label);
            mainDiv.appendChild(inputColor);

            divComponents.appendChild(mainDiv);
            i++;
        });
    }

    function sendMessageToFindPrefixes(id) {
        chrome.tabs.sendMessage(
            id,
            {
                type: 'findPrefixes'
            },
            ({ prefixes, components }) => {
                if (prefixes && prefixes.length) {
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
