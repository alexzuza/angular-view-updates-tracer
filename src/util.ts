export function createCheckbox(id: string, changeListener: () => void): HTMLInputElement {
  const inputCheckbox = document.createElement('input');
  inputCheckbox.id = id;
  inputCheckbox.type = 'checkbox';
  inputCheckbox.addEventListener('change', changeListener);
  inputCheckbox.checked = false;

  return inputCheckbox;
}

export function createInput(id: string, value: string, changeListener: () => void): HTMLInputElement {
  const inputText = document.createElement('input');
  inputText.id = id;
  inputText.type = 'text';
  inputText.value = value;

  return inputText;
}

export function createLabel(id: string, text: string): HTMLLabelElement {
  const label = document.createElement('label');
  label.htmlFor = id;
  label.textContent = text;

  return label;
}
