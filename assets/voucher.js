/* Canvas renderer for vouchers, Instagram posts and stories.
   Needs fonts Fraunces + Manrope loaded, and qrcode-generator (global `qrcode`) for QR codes. */
(function () {
  const TYPES = { salonas: "Grožio salonas", kavine: "Kavinė", spa: "Masažai ir SPA", barber: "Barberių studija", studija: "Studija", pabegimo: "Pabėgimo kambarys", nagai: "Nagų studija", foto: "Fotostudija" };

  function rgb(hex) { const n = parseInt(hex.replace("#", ""), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(hex, target, p) { const a = rgb(hex); return `rgb(${a.map((v, i) => Math.round(v + (target[i] - v) * p)).join(",")})`; }
  const dark = (hex, p) => mix(hex, [0, 0, 0], p);
  const light = (hex, p) => mix(hex, [255, 255, 255], p);

  function fitFont(ctx, text, weight, family, size, maxW, min = 14) {
    let s = size;
    for (;;) { ctx.font = `${weight} ${s}px ${family}`; if (ctx.measureText(text).width <= maxW || s <= min) return s; s -= 2; }
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function spaced(ctx, px) { if ("letterSpacing" in ctx) ctx.letterSpacing = px + "px"; }
  function wrapLines(ctx, text, maxW, maxLines) {
    const words = text.split(/\s+/).filter(Boolean), lines = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…"; }
    return lines;
  }
  function drawQR(ctx, text, x, y, size) {
    ctx.fillStyle = "#fff"; rr(ctx, x, y, size, size, size * 0.07); ctx.fill();
    if (!window.qrcode) return;
    const q = window.qrcode(0, "M"); q.addData(text); q.make();
    const n = q.getModuleCount(), pad = size * 0.09, cell = (size - 2 * pad) / n;
    ctx.fillStyle = "#121212";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
  }

  /* o: {name, color, amount, to, message, code, valid, qr, logo(Image)} — draws at 1600x1000 */
  function drawVoucher(ctx, o) {
    const W = 1600, H = 1000, M = 96;
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, o.color); g.addColorStop(1, dark(o.color, 0.5));
    rr(ctx, 0, 0, W, H, 52); ctx.fillStyle = g; ctx.fill(); ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.lineWidth = 2;
    for (let i = 1; i <= 9; i++) { ctx.beginPath(); ctx.arc(W * 0.98, H * 1.08, 130 * i, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = "#fff"; ctx.textBaseline = "alphabetic";
    if (o.logo) {
      const s = Math.min(380 / o.logo.width, 120 / o.logo.height); ctx.drawImage(o.logo, M, M - 20, o.logo.width * s, o.logo.height * s);
    } else {
      spaced(ctx, 5); fitFont(ctx, o.name.toUpperCase(), 700, "Manrope", 38, 860); ctx.fillText(o.name.toUpperCase(), M, M + 34);
    }
    spaced(ctx, 5); ctx.font = "600 30px Manrope"; ctx.globalAlpha = 0.8; ctx.textAlign = "right"; ctx.fillText("DOVANŲ KUPONAS", W - M, M + 32);
    ctx.textAlign = "left"; ctx.globalAlpha = 1; spaced(ctx, 0);
    const amt = o.amount + " €"; fitFont(ctx, amt, 600, "Fraunces", 250, 900); ctx.fillText(amt, M - 6, 540);
    let y = 630;
    if (o.to) { fitFont(ctx, "Kam: " + o.to, 600, "Manrope", 46, 900); ctx.fillText("Kam: " + o.to, M, y); y += 64; }
    if (o.message) { ctx.font = "400 36px Manrope"; ctx.globalAlpha = 0.88; for (const l of wrapLines(ctx, "„" + o.message + "“", 880, 2)) { ctx.fillText(l, M, y); y += 50; } ctx.globalAlpha = 1; }
    ctx.globalAlpha = 0.75; ctx.font = "500 30px Manrope"; ctx.fillText("Galioja iki " + o.valid, M, H - M - 58); ctx.globalAlpha = 1;
    spaced(ctx, 6); ctx.font = "600 36px ui-monospace, Menlo, monospace"; ctx.fillText(o.code, M, H - M); spaced(ctx, 0);
    drawQR(ctx, o.qr || o.code, W - M - 270, H - M - 270, 270);
    ctx.restore();
  }

  function voucherAt(ctx, o, cx, cy, scale, angle) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); ctx.scale(scale, scale); ctx.translate(-800, -500);
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,.28)"; ctx.shadowBlur = 90; ctx.shadowOffsetY = 40; rr(ctx, 0, 0, 1600, 1000, 52); ctx.fillStyle = o.color; ctx.fill(); ctx.restore();
    drawVoucher(ctx, o); ctx.restore();
  }

  function promoBase(ctx, o, W, H) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, light(o.color, 0.9)); g.addColorStop(1, light(o.color, 0.78));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = dark(o.color, 0.25); ctx.globalAlpha = 0.12;
    for (let i = 0; i < 70; i++) { const x = (i * 397) % W, y = (i * 653) % H, r = 2 + (i % 4); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function pill(ctx, text, cx, y, o, size) {
    ctx.font = `700 ${size}px Manrope`; const w = ctx.measureText(text).width + size * 1.6, h = size * 2.1;
    ctx.fillStyle = dark(o.color, 0.15); rr(ctx, cx - w / 2, y, w, h, h / 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.fillText(text, cx, y + h * 0.66); ctx.textAlign = "left";
  }

  function drawPost(ctx, o) {
    const W = 1080, H = 1080, ink = dark(o.color, 0.62);
    promoBase(ctx, o, W, H);
    ctx.textAlign = "center"; ctx.fillStyle = ink;
    spaced(ctx, 4); ctx.font = "700 26px Manrope"; ctx.fillText(o.name.toUpperCase(), W / 2, 110); spaced(ctx, 0);
    fitFont(ctx, "Dovanų kuponai", 600, "Fraunces", 104, 940); ctx.fillText("Dovanų kuponai", W / 2, 232);
    ctx.font = "italic 600 56px Fraunces"; ctx.fillText("dabar ir internetu", W / 2, 306);
    voucherAt(ctx, o, W / 2, 610, 0.5, -0.045);
    ctx.fillStyle = ink; ctx.font = "500 34px Manrope"; ctx.textAlign = "center";
    ctx.fillText("Nupirkite per minutę, kuponą gausite iškart", W / 2, 900);
    pill(ctx, "Nuoroda profilyje", W / 2, 940, o, 32);
  }

  function drawStory(ctx, o) {
    const W = 1080, H = 1920, ink = dark(o.color, 0.62);
    promoBase(ctx, o, W, H);
    ctx.textAlign = "center"; ctx.fillStyle = ink;
    spaced(ctx, 4); ctx.font = "700 30px Manrope"; ctx.fillText(o.name.toUpperCase(), W / 2, 300); spaced(ctx, 0);
    fitFont(ctx, "Dovanų kuponai", 600, "Fraunces", 120, 960); ctx.fillText("Dovanų kuponai", W / 2, 440);
    ctx.font = "italic 600 64px Fraunces"; ctx.fillText("Kalėdoms, net paskutinę minutę", W / 2, 530);
    voucherAt(ctx, o, W / 2, 920, 0.58, -0.05);
    ctx.fillStyle = ink; ctx.font = "500 40px Manrope"; ctx.textAlign = "center";
    ["Išsirinkite sumą", "Susimokėkite kortele", "Kuponą gausite iškart el. paštu"].forEach((t, i) => ctx.fillText(t, W / 2, 1300 + i * 66));
    pill(ctx, "Pirkti kuponą", W / 2, 1530, o, 40);
  }

  function code() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return "XMAS-" + s; }
  function validUntil() { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().slice(0, 10).replace(/-/g, "."); }
  async function fontsReady() { try { await Promise.all(["600 40px Fraunces", "italic 600 40px Fraunces", "700 40px Manrope", "400 40px Manrope"].map(f => document.fonts.load(f))); } catch (e) {} }
  function download(canvas, name) {
    canvas.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }, "image/png");
  }
  function slug(s) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "kuponas"; }

  window.Voucher = { TYPES, drawVoucher, drawPost, drawStory, code, validUntil, fontsReady, download, slug, dark, light };
})();
