export const $ = (sel, context = document.body) =>
  typeof sel === "string" ? context.querySelector(sel) : sel;

export const $$ = (sel, context = document) =>
  Array.from(context.querySelectorAll(sel));

export function clearChildren(sel, context = document.body) {
  let parentNode = $(sel, context);
  while (parentNode.firstChild) {
    parentNode.removeChild(parentNode.firstChild);
  }
  return parentNode;
}

export function replaceChildren(sel, childNodes, context = document.body) {
  let parentNode = clearChildren(sel, context);
  for (let node of childNodes) {
    parentNode.appendChild(node);
  }
  return parentNode;
}

export function updateElements(changes = [], context = document.body) {
  for (const sel in changes) {
    for (const el of $$(sel, context)) {
      updateElement(el, changes[sel]);
    }
  }
}

export function updateElement(el, changeSet) {
  if (typeof changeSet === "string") {
    el.textContent = changeSet;
  } else if (typeof changeSet === "function") {
    changeSet(el);
  } else {
    for (const name in changeSet) {
      const value = changeSet[name];
      if (name.startsWith("@")) {
        el.setAttribute(name.substring(1), value);
      } else if (name.startsWith(">")) {
        el.addEventListener(name.substring(1), value);
      } else if (name === "children") {
        replaceChildren(el, value);
      } else {
        el[name] = value;
      }
    }
  }
  return el;
}

export function createElement(name, changeSet = {}, context = document) {
  return updateElement(context.createElement(name), changeSet);
}

export function html(strings, ...values) {
  const src = strings
    .reduce(
      (result, string, idx) =>
        result + string + (values[idx] ? values[idx] : ""),
      ""
    )
    .trim();

  const frag = document
    .createRange()
    .createContextualFragment(`<template>${src}</template>`).firstElementChild;

  return document.adoptNode(frag);
}

export class BaseElement extends HTMLElement {
  constructor() {
    super();

    const self = this;

    this._props = {};
    for (let propertyName of this.constructor.observedProperties) {
      this.constructor.defineObservedProperty(self, propertyName);
    }

    this._renderScheduled = false;
    this.attachShadow({ mode: "open" }).appendChild(
      this.template().content.cloneNode(true)
    );
  }

  static defineObservedProperty(self, propertyName) {
    Object.defineProperty(self, propertyName, {
      get: function () {
        return self._props[propertyName];
      },
      set: function (newValue) {
        const oldValue = self._props[propertyName];
        if (newValue === oldValue) return;
        self._props[propertyName] = newValue;
        self.propChanged(propertyName, newValue, oldValue);
        let handler;
        if ("propHandlers" in this) {
          handler = self.propHandlers[propertyName];
        }
        if (!handler) {
          handler = self[`propChanged_${propertyName}`];
        }
        if (typeof handler === "function") {
          handler.call(self, newValue, oldValue);
        }
        self.scheduleRender();
      }
    });
  } 

  scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    window.requestAnimationFrame(() => {
      this.render()
      this._renderScheduled = false;
    });
  }

  template() {
    return this.constructor.template;
  }

  get props() {
    return this._props;
  }

  set props(newProps) {
    const oldProps = this._props;
    this._props = newProps;
    this.propsChanged(newProps, oldProps);
    this.scheduleRender();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    let handler;
    if ("attributeHandlers" in this) {
      handler = this.attributeHandlers[name];
    }
    if (!handler) {
      handler = this[`attributeChanged_${name}`];
    }
    if (typeof handler === "function") {
      handler.call(this, oldValue, newValue);
    }
    this.scheduleRender();
  }

  $(sel) {
    return $(sel, this.shadowRoot);
  }

  $$(sel) {
    return $$(sel, this.shadowRoot);
  }

  clearChildren(sel) {
    return clearChildren(sel, this.shadowRoot);
  }

  replaceChildren(sel, childNodes) {
    return replaceChildren(sel, childNodes, this.shadowRoot);
  }

  updateElements(changes) {
    return updateElements(changes, this.shadowRoot);
  }

  propChanged(propertyName, newValue, oldValue) { }

  propsChanged(newProps, oldProps) { }

  render() { }
}
