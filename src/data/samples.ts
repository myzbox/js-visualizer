export const SAMPLES = {
  "Event Loop Basics": `console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 0);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");`,
  "Variables & Logs": `const name = "Antigravity";
const version = 2.0;

console.log("Welcome to", name);
console.log("Version", version);

setTimeout(() => {
  console.log("Done");
}, 0);`,
  "Multiple Promises": `console.log("Sync 1");

Promise.resolve().then(() => {
  console.log("Microtask 1");
});

Promise.resolve().then(() => {
  console.log("Microtask 2");
});

console.log("Sync 2");`
} as const;

export type SampleName = keyof typeof SAMPLES;
