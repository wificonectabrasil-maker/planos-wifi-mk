import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [...nextCoreWebVitals, { ignores: ["artifacts/**", ".cache-tests/**", "test-results/**", "playwright-report/**"] }];

export default config;
