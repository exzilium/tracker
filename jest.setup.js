// jest.setup.js
if (typeof window === 'undefined') {
  global.window = {};
}
if (!global.window.dispatchEvent) {
  global.window.dispatchEvent = jest.fn();
}
