const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxL8M0z5uSG-XW0rhjUglaCmkfdhFj5rY2S9r8ycKLJup0oXYVDuaYsbJHXvWsKGncg4w/exec?key=cyanads2026";

export default async function handler(req, res) {
  try {
    const month = req.query.month;
    const url = month ? `${APPS_SCRIPT_URL}&month=${encodeURIComponent(month)}` : APPS_SCRIPT_URL;
    const upstream = await fetch(url, { redirect: "follow" });
    const data = await upstream.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
