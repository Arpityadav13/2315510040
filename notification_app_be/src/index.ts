import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const BASE_URL = "http://4.224.186.213/evaluation-service";

const AUTH_BODY = {
  email: "arpityaduvanshi0007@gmail.com",
  name: "Arpit yadav",
  rollNo: "2315510040",
  accessCode: "RPsgYt",
  clientID: "51a0490e-a13e-46a5-9d56-191bf8b375f0",
  clientSecret: "gRYQAqNqBMPbeMdD"
};

let token = "";

async function authenticate() {
  const res = await axios.post(`${BASE_URL}/auth`, AUTH_BODY);
  token = res.data.access_token;
}

app.get("/notifications", async (req, res) => {
  try {
    await authenticate();
    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/notifications/top/:n", async (req, res) => {
  try {
    await authenticate();
    const response = await axios.get(`${BASE_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const notifications = response.data.notifications;
    const n = parseInt(req.params.n) || 10;

    const weights: Record<string, number> = {
      Placement: 20,
      Result: 15,
      Event: 10,
    };

    const scored = notifications
      .filter((n: any) => !n.isRead)
      .map((notif: any) => {
        const ageInHours = (Date.now() - new Date(notif.Timestamp).getTime()) / 3600000;
        const recencyScore = Math.max(0, 100 - ageInHours);
        const score = (weights[notif.Type] || 0) + recencyScore;
        return { ...notif, score };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, n);

    res.json({ top: scored });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
