import files from './world-boss-art.json';

// World Boss trio stills (ART-UI-WORLDBOSS-TRIO-001): single-boss banners (card header), the camp card and the 128 px emblems that
// replace the letter medallions. Derivatives built by incoming/ART-UI-WORLDBOSS-TRIO-001/build_assets.py; the Codex masters stay in incoming/.
export type WbArt = keyof typeof files;
export const wbArtUrl = (name: WbArt): string => `${import.meta.env.BASE_URL}assets/ui/worldboss/${files[name]}`;
