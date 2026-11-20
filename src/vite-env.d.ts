/// <reference types="vite/client" />
// P09-02c: built in by vite.config.ts from scripts/content-version.mjs.
declare const __CONTENT_VERSION__: string;
// The commit (or content version) this page was built from; `version.json` carries the same for the check for a newer publish.
declare const __BUILD_ID__: string;
interface ImportMetaEnv { readonly VITE_FATEWEAVE_API?: string; readonly VITE_GOOGLE_CLIENT_ID?: string }
