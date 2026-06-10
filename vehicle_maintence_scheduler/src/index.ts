import axios from "axios";

const BASE_URL = "http://4.224.186.213/evaluation-service";

const AUTH_BODY = {
  email: "arpityaduvanshi0007@gmail.com",
  name: "Arpit yadav",
  rollNo: "2315510040",
  accessCode: "RPsgYt",
  clientID: "51a0490e-a13e-46a5-9d56-191bf8b375f0",
  clientSecret: "gRYQAqNqBMPbeMdD"
};

let headers: any = {};

interface Task { TaskID: string; Duration: number; Impact: number; }
interface Depot { ID: number; MechanicHours: number; }

async function authenticate() {
  const res = await axios.post(`${BASE_URL}/auth`, AUTH_BODY);
  headers = { Authorization: `Bearer ${res.data.access_token}` };
  console.log("Authenticated!");
}

async function log(stack: string, level: string, pkg: string, message: string) {
  try {
    await axios.post(`${BASE_URL}/logs`, { stack, level, package: pkg, message }, { headers });
  } catch (_) {}
}

async function getDepots(): Promise<Depot[]> {
  const res = await axios.get(`${BASE_URL}/depots`, { headers });
  return res.data.depots;
}

async function getTasks(depotId: number): Promise<Task[]> {
  const res = await axios.get(`${BASE_URL}/vehicles?depot_id=${depotId}`, { headers });
  return res.data.vehicles;
}

function selectTasks(tasks: Task[], mechanicHours: number): Task[] {
  const sorted = [...tasks].sort((a, b) => (b.Impact / b.Duration) - (a.Impact / a.Duration));
  const selected: Task[] = [];
  let usedHours = 0;
  for (const task of sorted) {
    if (usedHours + task.Duration <= mechanicHours) {
      selected.push(task);
      usedHours += task.Duration;
    }
  }
  return selected;
}

async function main() {
  try {
    await authenticate();
    const depots = await getDepots();
    console.log("Depots:", depots);
    for (const depot of depots) {
      const tasks = await getTasks(depot.ID);
      const selected = selectTasks(tasks, depot.MechanicHours);
      const totalHours = selected.reduce((s, t) => s + t.Duration, 0);
      const totalImpact = selected.reduce((s, t) => s + t.Impact, 0);
      console.log(`Depot ${depot.ID}: ${selected.length} tasks | hours: ${totalHours}/${depot.MechanicHours} | impact: ${totalImpact}`);
      await log("backend", "info", "service", `Depot ${depot.ID}: ${selected.length} tasks, impact: ${totalImpact}, hours: ${totalHours}/${depot.MechanicHours}`);
    }
    console.log("Done!");
  } catch (err: any) {
    console.error("Error:", err.response?.data ?? err.message);
  }
}

main();
