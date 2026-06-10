"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const axios_1 = __importDefault(require("axios"));
const LOG_API = "http://4.224.186.213/evaluation-service/logs";
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJhcnBpdHlhZHV2YW5zaGkwMDA3QGdtYWlsLmNvbSIsImV4cCI6MTc4MTA3NDQ0OSwiaWF0IjoxNzgxMDczNTQ5LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiYzAyZGZmNTktOGY5Ni00M2M2LWEzY2ItYzA2NDUwN2IzMDVhIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoiYXJwaXQgeWFkYXYiLCJzdWIiOiI1MWEwNDkwZS1hMTNlLTQ2YTUtOWQ1Ni0xOTFiZjhiMzc1ZjAifSwiZW1haWwiOiJhcnBpdHlhZHV2YW5zaGkwMDA3QGdtYWlsLmNvbSIsIm5hbWUiOiJhcnBpdCB5YWRhdiIsInJvbGxObyI6IjIzMTU1MTAwNDAiLCJhY2Nlc3NDb2RlIjoiUlBzZ1l0IiwiY2xpZW50SUQiOiI1MWEwNDkwZS1hMTNlLTQ2YTUtOWQ1Ni0xOTFiZjhiMzc1ZjAiLCJjbGllbnRTZWNyZXQiOiJnUllRQXFOcUJNUGJlTWREIn0.hK35MpF0zEDRqqoieevJoAT2PRtPVsllfPDyK9pIzY8";
async function log(stack, level, pkg, message) {
    try {
        await axios_1.default.post(LOG_API, {
            stack,
            level,
            package: pkg,
            message,
        }, {
            headers: {
                "Authorization": `Bearer ${TOKEN}`
            }
        });
    }
    catch (err) {
        console.error("Logging failed:", err);
    }
}
