// pages/api/data.js
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxL8M0z5uSG-XW0rhjUglaCmkfdhFj5rY2S9r8ycKLJup0oXYVDuaYsbJHXvWsKGncg4w/exec?key=cyanads2026";

export default async function handler(req, res) {
  try {
    const upstream = await fetch(APPS_SCRIPT_URL, {
      redirect: "follow",
      headers: { "Accept": "application/json" },
    });
    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res.setHeader("Content-Type", "text/plain");
      return res.status(502).send(`Apps Script returned non-JSON (status ${upstream.status}):\n\n${text.slice(0, 2000)}`);
    }
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
