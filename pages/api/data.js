const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxL8M0z5uSG-XW0rhjUglaCmkfdhFj5rY2S9r8ycKLJup0oXYVDuaYsbJHXvWsKGncg4w/exec?key=cyanads2026";

export default async function handler(req, res) {
  try {
    const upstream = await fetch(APPS_SCRIPT_URL, { redirect: "follow" });
    const data = await upstream.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
