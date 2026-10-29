export const bus = new EventTarget();
export const emit = (name, detail) => bus.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, fn) => bus.addEventListener(name, (e) => fn(e.detail));
export const rafThrottle = (fn) => { let q = false, last; return (...a) => { last = a; if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...last); }); }; };
