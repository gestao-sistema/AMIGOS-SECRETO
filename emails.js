// Modelos de e-mail – Amigo Havaiana · Azime
// HTML com estilos inline (compatível com Outlook e Gmail), paleta preto e branco da Azime.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const FONT = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const C = { black: "#0a0a0a", g900: "#1c1c1e", g700: "#3a3a3c", g500: "#8e8e93", g300: "#d4d4d8", g100: "#f2f2f4", page: "#e9e9ec" };

// linha de "ondas" desenhada com caracteres, para não depender de imagens
const ONDAS = `<div style="${FONT}color:#5a5a5e;font-size:14px;letter-spacing:2px;line-height:1;">〜〜〜〜〜〜〜〜〜〜〜〜</div>`;

function layout({ topo, titulo, corpo, rodape }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
    <tr><td align="center" style="background:${C.black};padding:30px 24px 26px;">
      <div style="${FONT}color:#ffffff;font-size:13px;letter-spacing:8px;font-weight:300;">A Z I M E</div>
      <div style="${FONT}color:${C.g500};font-size:10px;letter-spacing:4px;margin-top:4px;">APRESENTA</div>
      <div style="font-size:54px;line-height:1.1;margin:18px 0 8px;">${topo}</div>
      <div style="${FONT}color:#ffffff;font-size:26px;font-weight:700;line-height:1.25;">${titulo}</div>
      <div style="${FONT}color:${C.g300};font-size:13px;margin:10px 0 14px;letter-spacing:3px;">AMIGO HAVAIANA</div>
      ${ONDAS}
    </td></tr>
    <tr><td style="${FONT}color:${C.black};font-size:16px;line-height:1.6;padding:30px 30px 10px;">${corpo}</td></tr>
    <tr><td align="center" style="${FONT}color:${C.g500};font-size:12px;line-height:1.5;padding:14px 30px 28px;">
      ${rodape ? rodape + "<br>" : ""}<span style="letter-spacing:4px;">AZIME · AMIGO HAVAIANA</span></td></tr>
  </table>
</td></tr></table></body></html>`;
}

function linhaEntrega(entregaBR) {
  return entregaBR
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;"><tr><td align="center" style="background:${C.g100};border-radius:14px;padding:14px 16px;${FONT}font-size:16px;color:${C.black};">🎁 <b>Entrega das havaianas: ${esc(entregaBR)}</b><br><span style="font-size:14px;color:${C.g700};">Já anota na agenda e não esquece o presente!</span></td></tr></table>`
    : "";
}

function caixaObs(obs) {
  return obs
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;"><tr><td style="border-left:3px solid ${C.black};padding:6px 14px;${FONT}font-size:15px;color:${C.g700};">📌 ${esc(obs)}</td></tr></table>`
    : "";
}

function datas(linhas) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 0;border:1px solid ${C.g300};border-radius:14px;">
    ${linhas.filter(Boolean).map(([rotulo, valor], i) => `<tr><td style="${FONT}padding:12px 18px;font-size:12px;letter-spacing:2px;color:${C.g500};${i ? `border-top:1px solid ${C.g100};` : ""}">${rotulo}</td>
      <td align="right" style="${FONT}padding:12px 18px;font-size:16px;font-weight:700;color:${C.black};${i ? `border-top:1px solid ${C.g100};` : ""}">${esc(valor)}</td></tr>`).join("")}
  </table>`;
}

function resultado({ nome, amigo, chinelo, entregaBR, obs }) {
  return layout({
    topo: "🥁",
    titulo: "Rufem os tambores…<br>o sorteio saiu!",
    corpo: `
      <p style="margin:0 0 14px;font-size:18px;">Olá, <b>${esc(nome)}</b>! 👋</p>
      <p style="margin:0 0 22px;">Chegou o grande momento! O sorteio escolheu quem vai ganhar uma havaiana novinha de você:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"
        style="background:${C.black};border-radius:18px;padding:28px 16px;">
        <div style="${FONT}font-size:12px;color:${C.g300};font-weight:600;letter-spacing:4px;">✨ VOCÊ TIROU ✨</div>
        <div style="${FONT}font-size:36px;font-weight:800;color:#ffffff;line-height:1.2;margin:12px 0 18px;">${esc(amigo)}</div>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center"
          style="background:#ffffff;border-radius:999px;padding:11px 24px;${FONT}color:${C.black};font-size:17px;font-weight:800;">
          🩴 Havaiana nº ${esc(chinelo)}</td></tr></table>
      </td></tr></table>
      ${linhaEntrega(entregaBR)}
      ${caixaObs(obs)}
      <p style="margin:24px 0 6px;font-size:17px;text-align:center;"><b>🤫 Shhh… é segredo!</b></p>
      <p style="margin:0 0 6px;text-align:center;color:${C.g700};">Não conte pra ninguém, capriche na escolha<br>e prepare a melhor cara de paisagem na hora da troca! 😎</p>`,
    rodape: "Você recebeu este e-mail porque se inscreveu no Amigo Havaiana.",
  });
}

function confirmacao({ nome, chinelo, dataBR, entregaBR, link, obs }) {
  return layout({
    topo: "🙌",
    titulo: "Inscrição confirmada!",
    corpo: `
      <p style="margin:0 0 14px;font-size:18px;">Oba, <b>${esc(nome)}</b>! 🎉</p>
      <p style="margin:0;">Você está dentro do <b>Amigo Havaiana</b>! Agora é só esperar o grande dia.</p>
      ${datas([
        ["SUA HAVAIANA", `nº ${chinelo}`],
        ["SORTEIO (POR E-MAIL)", dataBR],
        entregaBR && ["ENTREGA", entregaBR],
      ])}
      ${caixaObs(obs)}
      <p style="margin:18px 0 0;color:${C.g500};font-size:14px;">Errou algo? É só se inscrever de novo com este mesmo e-mail: <a href="${esc(link)}" style="color:${C.black};">${esc(link)}</a></p>`,
  });
}

function convite({ dataBR, inscricaoBR, entregaBR, link, obs }) {
  return layout({
    topo: "💌",
    titulo: "Você foi convidado(a)!",
    corpo: `
      <p style="margin:0 0 14px;font-size:18px;">Olá! 👋</p>
      <p style="margin:0 0 24px;">Vai rolar o nosso <b>Amigo Havaiana</b> e você não pode ficar de fora! É só informar seu nome e o número da sua havaiana:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr><td align="center" style="background:${C.black};border-radius:12px;">
        <a href="${esc(link)}" style="display:inline-block;padding:15px 36px;${FONT}color:#ffffff;font-size:17px;font-weight:700;text-decoration:none;">Quero participar →</a>
      </td></tr></table>
      ${datas([
        ["INSCRIÇÕES ATÉ", inscricaoBR],
        ["SORTEIO (POR E-MAIL)", dataBR],
        entregaBR && ["ENTREGA", entregaBR],
      ])}
      ${caixaObs(obs)}`,
  });
}

module.exports = { resultado, confirmacao, convite, esc };
