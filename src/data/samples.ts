export const SAMPLES = {
  "Event Loop Basics": `console.log("Start");

setTimeout(() => {
  console.log("Timeout");
}, 1000);

Promise.resolve().then(() => {
  console.log("Promise");
});

console.log("End");`,
  "Variables & Logs": `const name = "Js Visualizer";
const version = 1.0;

console.log("Welcome to", name);
console.log("Version", version);

setTimeout(() => {
  console.log("Done");
}, 2000);`,
  "Multiple Promises": `console.log("Sync 1");

Promise.resolve().then(() => {
  console.log("Microtask 1");
});

Promise.resolve().then(() => {
  console.log("Microtask 2");
});

console.log("Sync 2");`,
  "Fetch with Network": `console.log("Start");

fetch('https://jsonplaceholder.typicode.com/todos/1')
  .then(response => {
    if (!response.ok) throw new Error("HTTP error");
    return response.json();
  })
  .then(data => {
    console.log("Data received", data);
  })
  .catch(error => {
    console.error("Fetch error:", error);
  });

console.log("End");`
} as const;

export type SampleName = keyof typeof SAMPLES;
