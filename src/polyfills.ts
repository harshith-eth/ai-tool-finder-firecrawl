// Ethereum polyfill
if (typeof window !== 'undefined' && !window.ethereum) {
  Object.defineProperty(window, 'ethereum', {
    value: {},
    writable: true,
    configurable: true,
    enumerable: true
  });
}

export {}; 