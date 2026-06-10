"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
async function main() {
    await (0, index_1.log)("backend", "info", "service", "Testing logging middleware");
    console.log("Log sent!");
}
main();
