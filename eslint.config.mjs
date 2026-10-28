import nextVitals from "eslint-config-next/core-web-vitals";
import { globalIgnores } from "eslint/config";

const config = [
    ...nextVitals,
    globalIgnores([".next/**", ".open-next/**", ".wrangler/**", "out/**", "build/**", "next-env.d.ts"]),
];

export default config;