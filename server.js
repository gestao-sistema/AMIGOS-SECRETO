// Amigo Havaiana
// - Participantes acessam "/" e cadastram nome, e-mail e número do chinelo.
// - O organizador acessa "/admin" (senha) para enviar convites, acompanhar e,
//   a partir da data do sorteio, sortear e enviar os resultados por e-mail.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const nodemailer = require("nodemailer");
const EMAILS = require("./emails");

/* ---------- .env simples (sem dependência extra) ---------- */
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const DRAW_DATE = process.env.DRAW_DATE || "2026-12-01";
const ENTREGA_DATE = process.env.ENTREGA_DATE || "";
// padrão: inscrições até o dia anterior ao sorteio
const INSCRICAO_ATE = process.env.INSCRICAO_ATE ||
  new Date(new Date(DRAW_DATE + "T12:00:00Z").getTime() - 86400000).toISOString().slice(0, 10);
const OBS = process.env.OBS || "";
// No Railway, monte um volume: o Railway define RAILWAY_VOLUME_MOUNT_PATH e os dados ficam lá.
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const DATA_FILE = path.join(DATA_DIR, "data.json");

if (!ADMIN_PASSWORD) {
  console.error("Defina ADMIN_PASSWORD antes de iniciar (no arquivo .env local, ou em Variables no Railway)."); 
  process.exit(1);
}

/* ---------- armazenamento em arquivo JSON ---------- */
function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { participants: [], pairs: null, sorteadoEm: null, convites: {} }; }
}
let DB = load();
function save() {
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(DB, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

/* ---------- e-mail ---------- */
// Sem SMTP_HOST: modo teste, os e-mails só aparecem no console (nada é enviado).
const MODO_TESTE = !process.env.SMTP_HOST;
const transporter = MODO_TESTE
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE).toLowerCase() === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
const FROM = process.env.MAIL_FROM || process.env.SMTP_USER || "amigo-secreto@localhost";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function sendMail(to, subject, html) {
  const info = await transporter.sendMail({ from: FROM, to, subject, html });
  if (MODO_TESTE) {
    const texto = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log(`
[E-MAIL TESTE] Para: ${to}
  Assunto: ${subject}
  ${texto}`);
  }
  return info;
}

const br = (d) => (d ? d.split("-").reverse().join("/") : "");
const dataBR = br(DRAW_DATE), inscricaoBR = br(INSCRICAO_ATE), entregaBR = br(ENTREGA_DATE);
// data de hoje no fuso de São Paulo (AAAA-MM-DD)
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const isDrawDay = () => hojeSP() >= DRAW_DATE;
const inscricoesAbertas = () => !DB.pairs && hojeSP() <= INSCRICAO_ATE;
const DATAS = () => ({ dataBR, inscricaoBR, entregaBR });

/* ---------- sorteio: ciclo único (sem repetição, ninguém tira a si mesmo) ---------- */
function drawPairs(ids) {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const pairs = {};
  a.forEach((id, i) => (pairs[id] = a[(i + 1) % a.length]));
  return pairs;
}

/* ---------- app ---------- */
const app = express();
app.set("trust proxy", 1); // atrás do proxy do Railway/Cloudflare: IP real e https
app.use(express.json());
// Página inicial com o endereço real preenchido (prévia do link no WhatsApp)
const INDEX_HTML = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
function baseDe(req) {
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = (req.get("x-forwarded-proto") || req.protocol).split(",")[0];
  return /^[\w.:\[\]-]+$/.test(host || "") ? `${proto === "https" ? "https" : "http"}://${host}` : BASE_URL;
}
app.get(["/", "/index.html"], (req, res) => res.type("html").send(INDEX_HTML.replaceAll("__BASE__", baseDe(req))));
app.use(express.static(path.join(__dirname, "public"), { index: false }));

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

// Inscrição do participante
app.post("/api/inscricao", (req, res) => {
  if (DB.pairs) return res.status(400).json({ erro: "O sorteio já foi realizado. Inscrições encerradas." });
  if (!inscricoesAbertas()) return res.status(400).json({ erro: `As inscrições foram encerradas em ${inscricaoBR}.` });
  const nome = String(req.body.nome || "").trim().slice(0, 80);
  const email = String(req.body.email || "").trim().toLowerCase().slice(0, 120);
  const chinelo = String(req.body.chinelo || "").trim().slice(0, 10);
  if (!nome || !isEmail(email) || !/^\d{2}([\/\-]\d{2})?$/.test(chinelo))
    return res.status(400).json({ erro: "Preencha nome, e-mail válido e número do chinelo (ex.: 38 ou 37/38)." });

  const existente = DB.participants.find((p) => p.email === email);
  if (existente) Object.assign(existente, { nome, chinelo });
  else DB.participants.push({ id: crypto.randomUUID(), nome, email, chinelo, criadoEm: new Date().toISOString(), resultado: null, erro: null });
  save();
  res.json({ ok: true, atualizado: !!existente, dataSorteio: dataBR, dataInscricao: inscricaoBR, dataEntrega: entregaBR });

  // confirmação por e-mail (não bloqueia a resposta)
  sendMail(email, "🙌 Amigo Havaiana – inscrição confirmada!",
    EMAILS.confirmacao({ nome, chinelo, ...DATAS(), link: baseDe(req), obs: OBS }))
    .catch((e) => console.error(`Falha ao enviar confirmação para ${email}: ${e.message}`));
});

// horário de São Paulo (UTC-3, sem horário de verão desde 2019)
app.get("/api/info", (req, res) => res.json({
  dataSorteio: dataBR,
  dataInscricao: inscricaoBR,
  dataEntrega: entregaBR,
  fimInscricaoISO: `${INSCRICAO_ATE}T23:59:59-03:00`,
  sorteioISO: `${DRAW_DATE}T${AUTO_SORTEIO ? AUTO_HORA : "00:00"}:00-03:00`,
  inscricoesAbertas: inscricoesAbertas(),
  encerrado: !!DB.pairs,
}));

/* ---------- área do organizador (login com cookie assinado) ---------- */
const SESSAO_HORAS = 12;
const SEGREDO = crypto.createHash("sha256").update("sessao:" + ADMIN_PASSWORD).digest();
const assinar = (exp) => crypto.createHmac("sha256", SEGREDO).update(String(exp)).digest("hex");
function sessaoValida(req) {
  const m = (req.headers.cookie || "").match(/(?:^|;\s*)adm=(\d+)\.([a-f0-9]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return crypto.timingSafeEqual(Buffer.from(m[2], "hex"), Buffer.from(assinar(m[1]), "hex"));
}
const cookieSeguro = BASE_URL.startsWith("https://") ? "; Secure" : "";
function auth(req, res, next) {
  if (sessaoValida(req)) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ erro: "Sessão expirada. Entre novamente." });
  res.redirect("/login");
}

// limite de tentativas: 8 erros a cada 15 minutos por IP
const tentativas = new Map();
app.post("/api/login", (req, res) => {
  const ip = req.ip, agora = Date.now();
  const t = tentativas.get(ip);
  if (t && t.ate > agora && t.n >= 8) {
    const min = Math.ceil((t.ate - agora) / 60000);
    return res.status(429).json({ erro: `Muitas tentativas. Tente de novo em ${min} min.` });
  }
  const senha = String(req.body.senha || "");
  const ok = crypto.timingSafeEqual(
    crypto.createHash("sha256").update(senha).digest(),
    crypto.createHash("sha256").update(ADMIN_PASSWORD).digest());
  if (!ok) {
    const novo = t && t.ate > agora ? t : { n: 0, ate: agora + 15 * 60 * 1000 };
    novo.n++; tentativas.set(ip, novo);
    return res.status(401).json({ erro: "Senha incorreta." });
  }
  tentativas.delete(ip);
  const exp = agora + SESSAO_HORAS * 3600 * 1000;
  res.set("Set-Cookie", `adm=${exp}.${assinar(exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSAO_HORAS * 3600}${cookieSeguro}`);
  res.json({ ok: true });
});
app.post("/api/logout", (req, res) => {
  res.set("Set-Cookie", `adm=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${cookieSeguro}`);
  res.json({ ok: true });
});
app.get("/login", (req, res) => sessaoValida(req) ? res.redirect("/admin") : res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/admin", auth, (req, res) => res.sendFile(path.join(__dirname, "views", "admin.html")));

app.get("/api/admin/estado", auth, (req, res) => {
  res.json({
    dataSorteio: dataBR,
    dataInscricao: inscricaoBR,
    dataEntrega: entregaBR,
    inscricoesAbertas: inscricoesAbertas(),
    liberado: isDrawDay(),
    auto: { ativo: AUTO_SORTEIO, hora: AUTO_HORA },
    modoTeste: MODO_TESTE,
    sorteadoEm: DB.sorteadoEm,
    convites: DB.convites,
    // o resultado (quem tirou quem) NÃO é enviado para a tela
    participants: DB.participants.map(({ id, nome, email, chinelo, resultado, erro }) => ({ id, nome, email, chinelo, resultado, erro })),
  });
});

app.delete("/api/admin/participante/:id", auth, (req, res) => {
  if (DB.pairs) return res.status(400).json({ erro: "Sorteio já realizado." });
  DB.participants = DB.participants.filter((p) => p.id !== req.params.id);
  save();
  res.json({ ok: true });
});

// Envia convites com o link de inscrição
app.post("/api/admin/convites", auth, async (req, res) => {
  const emails = [...new Set(String(req.body.emails || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(isEmail))];
  const resultado = [];
  for (const email of emails) {
    try {
      await sendMail(email, "💌 Você foi convidado(a) para o Amigo Havaiana!",
        EMAILS.convite({ ...DATAS(), link: baseDe(req), obs: OBS }));
      DB.convites[email] = "enviado";
      resultado.push({ email, ok: true });
    } catch (e) {
      DB.convites[email] = "erro";
      resultado.push({ email, ok: false, erro: e.message });
    }
    save();
  }
  res.json({ resultado });
});

let enviando = false;
async function enviarResultados(somenteErros) {
  const byId = Object.fromEntries(DB.participants.map((p) => [p.id, p]));
  for (const p of DB.participants) {
    if (somenteErros ? p.resultado !== "erro" : p.resultado === "enviado") continue;
    const r = byId[DB.pairs[p.id]];
    try {
      await sendMail(p.email, "🥁 Amigo Havaiana – descubra quem você tirou!",
        EMAILS.resultado({ nome: p.nome, amigo: r.nome, chinelo: r.chinelo, ...DATAS(), obs: OBS }));
      p.resultado = "enviado"; p.erro = null;
    } catch (e) {
      p.resultado = "erro"; p.erro = e.message;
    }
    save();
  }
}

// Retorna mensagem de erro, ou null se sorteou e enviou.
async function sortearEEnviar() {
  if (DB.pairs) return "O sorteio já foi realizado.";
  if (!isDrawDay()) return `O sorteio só pode ser feito a partir de ${dataBR}.`;
  if (DB.participants.length < 3) return "São necessários pelo menos 3 participantes.";
  if (enviando) return "Envio em andamento.";
  enviando = true;
  try {
    DB.pairs = drawPairs(DB.participants.map((p) => p.id));
    DB.sorteadoEm = new Date().toISOString();
    DB.participants.forEach((p) => { p.resultado = null; p.erro = null; });
    save();
    await enviarResultados(false);
  } finally { enviando = false; }
  return null;
}

app.post("/api/admin/sortear", auth, async (req, res) => {
  const erro = await sortearEEnviar();
  if (erro) return res.status(erro === "Envio em andamento." ? 409 : 400).json({ erro });
  res.json({ ok: true });
});

/* ---------- sorteio automático no dia ---------- */
// Com AUTO_SORTEIO=true (padrão), o servidor sorteia e envia sozinho a partir de
// DRAW_DATE às AUTO_HORA (horário de São Paulo). O servidor precisa estar ligado.
const AUTO_SORTEIO = String(process.env.AUTO_SORTEIO ?? "true").toLowerCase() !== "false";
const AUTO_HORA = process.env.AUTO_HORA || "09:00";
function horaSP() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}
let ultimoAviso = null;
let ultimaRetentativa = 0;
async function verificarAuto() {
  // Se algum resultado falhou (ex.: Microsoft fora do ar), tenta de novo a cada 10 min.
  if (DB.pairs && !enviando && DB.participants.some((p) => p.resultado === "erro") && Date.now() - ultimaRetentativa > 10 * 60 * 1000) {
    ultimaRetentativa = Date.now();
    enviando = true;
    try { await enviarResultados(true); } finally { enviando = false; }
    const faltam = DB.participants.filter((p) => p.resultado === "erro").length;
    console.log(faltam ? `[auto] Reenvio: ainda ${faltam} com erro, nova tentativa em 10 min.` : "[auto] Reenvio: todos os resultados enviados.");
    return;
  }
  if (!AUTO_SORTEIO || DB.pairs || enviando || !isDrawDay()) return;
  if (hojeSP() === DRAW_DATE && horaSP() < AUTO_HORA) return;
  const erro = await sortearEEnviar();
  const msg = erro ? `[auto] Sorteio não realizado: ${erro}` : "[auto] Sorteio realizado e resultados enviados.";
  if (msg !== ultimoAviso) console.log(msg);
  ultimoAviso = msg;
}
setInterval(() => verificarAuto().catch((e) => console.error("[auto]", e)), 60 * 1000);
setTimeout(() => verificarAuto().catch((e) => console.error("[auto]", e)), 3000);

app.post("/api/admin/reenviar", auth, async (req, res) => {
  if (!DB.pairs) return res.status(400).json({ erro: "Sorteio ainda não realizado." });
  if (enviando) return res.status(409).json({ erro: "Envio em andamento." });
  enviando = true;
  try { await enviarResultados(true); } finally { enviando = false; }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Amigo Secreto rodando em ${BASE_URL} (porta ${PORT}). Admin: ${BASE_URL}/admin`);
  console.log(`Dados em: ${DATA_FILE}`);
  console.log(`Inscrições até ${inscricaoBR}.` + (entregaBR ? ` Entrega: ${entregaBR}.` : ""));
  console.log(AUTO_SORTEIO ? `Sorteio automático: ${dataBR} às ${AUTO_HORA} (São Paulo).` : "Sorteio automático desligado (use o botão no /admin).");
  if (MODO_TESTE) console.log("MODO TESTE: sem SMTP_HOST, os e-mails só aparecem aqui no console.");
});
