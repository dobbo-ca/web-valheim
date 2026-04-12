import '@testing-library/jest-dom/vitest';

// jsdom doesn't provide matchMedia — stub it for component tests
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
}
