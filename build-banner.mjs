// Usage: node build-banner.mjs
// Needs Node 18+ (built-in fetch). Embeds your GitHub avatar into the banner
// and writes dark.svg. SVGs shown through README <img> tags can't load
// external images, so the avatar has to be inlined as base64.
import { readFile, writeFile } from "node:fs/promises";

const USER = "heyItsRocky";

const res = await fetch(`https://github.com/${USER}.png?size=256`);
if (!res.ok) throw new Error(`Avatar download failed: ${res.status}`);

const type = res.headers.get("content-type") || "image/png";
const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");

const template = await readFile("banner.template.svg", "utf8");
await writeFile("dark.svg", template.replace("__AVATAR__", `data:${type};base64,${b64}`));

console.log("dark.svg written");
