const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzmfXzo3866YMgbN8s36HYmADcGM-n4_0VQMM1baDcJrOpgr61NsLXMYf_fw6kvKiS7iA/exec?key=cyanads2026";

export default async function handler(req, res) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      redirect: "follow",
    });
    const data = await response.json();
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (err) {
    console.error("Proxy fetch failed:", err);
    res.status(502).json({ error: "Upstream fetch failed" });
  }
}
