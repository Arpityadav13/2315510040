import { log } from "./index";

async function main() {
  await log("backend", "info", "service", "Testing logging middleware");
  console.log("Log sent!");
}

main();
