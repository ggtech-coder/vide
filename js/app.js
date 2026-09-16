import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, getDocs, getDoc,
  deleteDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  firebaseConfig, JEJUM_INICIO, JEJUM_DIAS, JEJUM_TEMA, REDES_PADRAO,
  IGREJA_NOME, IGREJA_LOGO, ADMIN_PIN_PADRAO
} from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_VALOR_SELECT = "__ADMIN__";
const $ = (id) => document.getElementById(id);

// ===================== UTIL =====================

function pad(n){ return String(n).padStart(2, "0"); }

function dataDoDia(diaNumero){
  const inicio = new Date(JEJUM_INICIO + "T00:00:00");
  const d = new Date(inicio);
  d.setDate(d.getDate() + (diaNumero - 1));
  return d;
}

function dataFromDia(diaNumero){
  const d = dataDoDia(diaNumero);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
}

function diaAtualEstimado(){
  const inicio = new Date(JEJUM_INICIO + "T00:00:00");
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const diff = Math.round((hoje - inicio) / 86400000) + 1;
  if (diff < 1) return 1;
  if (diff > JEJUM_DIAS) return JEJUM_DIAS;
  return diff;
}

function formatarMinutos(totalMin){
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0 && m === 0) return "0min";
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function somaRegistros(registros, diaFiltro){
  return registros
    .filter(r => diaFiltro === "todos" || r.dia === diaFiltro)
    .reduce((acc, r) => acc + (r.minutos || 0), 0);
}

function logoDaRede(redeId){
  const r = REDES_PADRAO.find(x => x.id === redeId);
  return r && r.logo ? r.logo : null;
}

function escapar(txt){
  return String(txt ?? "").replace(/[&<>"']/g, c => (
    { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]
  ));
}

const reduzMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function animarValor(el, deValor, paraValor){
  if (reduzMovimento || deValor === paraValor){
    el.textContent = formatarMinutos(paraValor);
    return;
  }
  const duracao = 500;
  const inicioT = performance.now();
  function passo(agora){
    const t = Math.min(1, (agora - inicioT) / duracao);
    const suavizado = 1 - Math.pow(1 - t, 3);
    el.textContent = formatarMinutos(Math.round(deValor + (paraValor - deValor) * suavizado));
    if (t < 1) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}

// =====================================================================
// TEMA CLARO / ESCURO  +  CÉU NOTURNO
// Três estados: automático (escurece das 18h às 6h), claro e escuro.
// A preferência fica salva no navegador.
// =====================================================================

const TEMA_ORDEM = ["auto", "claro", "escuro"];
const TEMA_ICONE = { auto: "🌗", claro: "☀️", escuro: "🌙" };
const TEMA_NOME  = { auto: "Tema automático (muda sozinho à noite)", claro: "Tema claro", escuro: "Tema escuro" };

let temaPref = "auto";
let ceuMontado = false;
let meteoroTimer = null;

function lerTemaPref(){
  try { return localStorage.getItem("tema-pref") || "auto"; } catch(e){ return "auto"; }
}
function salvarTemaPref(v){
  try { localStorage.setItem("tema-pref", v); } catch(e){}
}

function ehNoite(){
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

function temaResolvido(){
  if (temaPref === "claro") return "claro";
  if (temaPref === "escuro") return "escuro";
  return ehNoite() ? "escuro" : "claro";
}

function aplicarTema(){
  const tema = temaResolvido();
  document.documentElement.setAttribute("data-tema", tema);
  const meta = $("meta-theme-color");
  if (meta) meta.setAttribute("content", tema === "escuro" ? "#0E1317" : "#FBFAF7");

  const btn = $("btn-tema");
  btn.textContent = TEMA_ICONE[temaPref];
  btn.title = TEMA_NOME[temaPref];
  btn.setAttribute("aria-label", TEMA_NOME[temaPref]);

  if (tema === "escuro"){
    montarCeu();
    iniciarMeteoros();
  } else {
    pararMeteoros();
  }
}

function montarCeu(){
  if (ceuMontado) return;
  ceuMontado = true;
  const ceu = $("ceu");
  const frag = document.createDocumentFragment();

  const lua = document.createElement("div");
  lua.className = "lua";
  frag.appendChild(lua);

  const qtd = window.innerWidth < 600 ? 45 : 90;
  for (let i = 0; i < qtd; i++){
    const e = document.createElement("span");
    e.className = "estrela";
    const tam = Math.random() < .82 ? (1 + Math.random() * 1.4) : (2.2 + Math.random() * 1.3);
    e.style.width = `${tam.toFixed(2)}px`;
    e.style.height = e.style.width;
    e.style.left = `${(Math.random() * 100).toFixed(2)}%`;
    e.style.top = `${(Math.random() * 100).toFixed(2)}%`;
    e.style.setProperty("--dur", `${(2.5 + Math.random() * 4).toFixed(2)}s`);
    e.style.setProperty("--atraso", `${(Math.random() * 5).toFixed(2)}s`);
    frag.appendChild(e);
  }
  ceu.appendChild(frag);
}

function iniciarMeteoros(){
  if (meteoroTimer || reduzMovimento) return;
  meteoroTimer = setInterval(() => {
    if (document.documentElement.getAttribute("data-tema") !== "escuro") return;
    if (document.hidden) return;
    const m = document.createElement("div");
    m.className = "meteoro";
    m.style.left = `${5 + Math.random() * 55}%`;
    m.style.top = `${5 + Math.random() * 40}%`;
    $("ceu").appendChild(m);
    setTimeout(() => m.remove(), 1700);
  }, 16000);
}
function pararMeteoros(){
  if (meteoroTimer){ clearInterval(meteoroTimer); meteoroTimer = null; }
}

$("btn-tema").addEventListener("click", () => {
  temaPref = TEMA_ORDEM[(TEMA_ORDEM.indexOf(temaPref) + 1) % TEMA_ORDEM.length];
  salvarTemaPref(temaPref);
  aplicarTema();
  const tema = temaResolvido();
  toast(temaPref === "auto"
    ? `Tema automático — agora está ${tema === "escuro" ? "escuro" : "claro"}.`
    : `Tema ${temaPref} fixado.`);
});

// No modo automático, reavalia de minuto em minuto — quando dá 18h o site
// escurece sozinho e aparecem a lua e as estrelas.
setInterval(() => { if (temaPref === "auto") aplicarTema(); }, 60000);

// ===================== TOASTS =====================

function toast(mensagem, tipo = "ok"){
  const cont = $("toast-container");
  const el = document.createElement("div");
  el.className = "toast" + (tipo === "erro" ? " erro-toast" : "");
  el.textContent = mensagem;
  cont.appendChild(el);
  setTimeout(() => {
    el.classList.add("saindo");
    setTimeout(() => el.remove(), 220);
  }, 3200);
}

// ===================== MODAL DE CONFIRMAÇÃO =====================

function confirmarModal(texto, textoBotao = "Excluir"){
  return new Promise((resolve) => {
    const modal = $("modal-confirmar");
    $("modal-confirmar-texto").textContent = texto;
    const btnOk = $("modal-confirmar-ok");
    const btnCancelar = $("modal-cancelar");
    btnOk.textContent = textoBotao;
    modal.classList.remove("oculto");

    function limpar(resultado){
      modal.classList.add("oculto");
      btnOk.removeEventListener("click", onOk);
      btnCancelar.removeEventListener("click", onCancelar);
      document.removeEventListener("keydown", onEsc);
      resolve(resultado);
    }
    function onOk(){ limpar(true); }
    function onCancelar(){ limpar(false); }
    function onEsc(e){ if (e.key === "Escape") limpar(false); }

    btnOk.addEventListener("click", onOk);
    btnCancelar.addEventListener("click", onCancelar);
    document.addEventListener("keydown", onEsc);
  });
}

// ===================== ESTADO =====================

let escopoAtual = diaAtualEstimado();
let diaPainel = diaAtualEstimado();
let redeLogada = null;
let modoMestre = false;
let redesCache = [];
let diaLancamento = diaAtualEstimado();
let ultimoTotalGeral = 0;
let autoRefreshTimer = null;
let primeiraCargaPainel = true;
let ultimoResumo = null;

// Quais blocos estão abertos no painel (para não fechar sozinho ao atualizar)
const abertosPainel = new Set();
// Quais células estão abertas na área do discipulador
const abertosAdmin = new Set();

// ===================== NAVEGAÇÃO ENTRE ABAS =====================

$("abas").addEventListener("click", (e) => {
  const btn = e.target.closest(".aba");
  if (!btn) return;
  document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("ativo"));
  btn.classList.add("ativa");
  $(`tab-${btn.dataset.aba}`).classList.add("ativo");
});

// ===================== CABEÇALHO =====================

$("jejum-tema").textContent = `Jejum de ${JEJUM_DIAS} dias — ${JEJUM_TEMA}`;
$("logo-igreja").alt = IGREJA_NOME;
$("logo-igreja").src = IGREJA_LOGO;
$("telao-logo").src = IGREJA_LOGO;
$("telao-logo").alt = IGREJA_NOME;
$("telao-tema").textContent = `Jejum de ${JEJUM_DIAS} dias — ${JEJUM_TEMA}`;

// ===================== BUSCA DE DADOS =====================

async function buscarTodasRedes(){
  const redesSnap = await getDocs(collection(db, "redes"));
  return Promise.all(redesSnap.docs.map(async (redeDoc) => {
    const celulas = await buscarUmaRede(redeDoc.id);
    return { id: redeDoc.id, ...redeDoc.data(), celulas };
  }));
}

async function buscarUmaRede(redeId){
  const celulasSnap = await getDocs(collection(db, "redes", redeId, "celulas"));
  return Promise.all(celulasSnap.docs.map(async (celDoc) => {
    const membrosSnap = await getDocs(collection(db, "redes", redeId, "celulas", celDoc.id, "membros"));
    const membros = await Promise.all(membrosSnap.docs.map(async (memDoc) => {
      const regSnap = await getDocs(collection(db, "redes", redeId, "celulas", celDoc.id, "membros", memDoc.id, "registros"));
      return { id: memDoc.id, ...memDoc.data(), registros: regSnap.docs.map(d => ({ id: d.id, ...d.data() })) };
    }));
    return { id: celDoc.id, ...celDoc.data(), membros };
  }));
}

// ===================== SEED =====================

async function verificarSeed(){
  const redesSnap = await getDocs(collection(db, "redes"));
  $("seed-aviso").classList.toggle("oculto", !redesSnap.empty);
}

$("btn-seed").addEventListener("click", async () => {
  const btn = $("btn-seed");
  btn.disabled = true;
  btn.textContent = "Configurando…";
  for (const r of REDES_PADRAO){
    await setDoc(doc(db, "redes", r.id), { nome: r.nome, categoria: r.categoria, pin: r.pin });
  }
  await setDoc(doc(db, "config", "admin"), { pin: ADMIN_PIN_PADRAO }, { merge: true });
  await verificarSeed();
  await carregarPainel();
  await popularSelectRedesLogin();
  btn.disabled = false;
  btn.textContent = "Configurar as 6 redes iniciais";
  toast("Redes configuradas com sucesso.");
});

// ===================== SELETOR DE DIA (painel) =====================

function atualizarEscopo(){
  const vendoTudo = escopoAtual === "todos";
  $("escopo-dia").classList.toggle("desativado", vendoTudo);
  $("escopo-dia-num").textContent = `Dia ${diaPainel}`;
  $("escopo-dia-data").textContent = dataFromDia(diaPainel);
  $("escopo-prev").disabled = vendoTudo || diaPainel <= 1;
  $("escopo-next").disabled = vendoTudo || diaPainel >= JEJUM_DIAS;
  document.querySelectorAll(".escopo-op").forEach(b => {
    b.classList.toggle("ativa", (b.dataset.escopo === "todos") === vendoTudo);
  });
  $("total-geral-rotulo").textContent =
    vendoTudo ? `de oração nos ${JEJUM_DIAS} dias` : `de oração no Dia ${diaPainel}`;
}

function irParaDia(d){
  diaPainel = Math.min(JEJUM_DIAS, Math.max(1, d));
  escopoAtual = diaPainel;
  atualizarEscopo();
  carregarPainel();
}

$("escopo-prev").addEventListener("click", () => irParaDia(diaPainel - 1));
$("escopo-next").addEventListener("click", () => irParaDia(diaPainel + 1));

document.querySelectorAll(".escopo-op").forEach(btn => {
  btn.addEventListener("click", () => {
    escopoAtual = btn.dataset.escopo === "todos" ? "todos" : diaPainel;
    atualizarEscopo();
    carregarPainel();
  });
});

document.addEventListener("keydown", (e) => {
  const digitando = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (digitando) return;
  const noTelao = document.body.classList.contains("telao");
  if (!noTelao && !$("tab-painel").classList.contains("ativo")) return;
  if (e.key === "ArrowLeft" && escopoAtual !== "todos") irParaDia(diaPainel - 1);
  if (e.key === "ArrowRight" && escopoAtual !== "todos") irParaDia(diaPainel + 1);
  if (e.key.toLowerCase() === "t") alternarTelao();
  // Em tela cheia o próprio navegador trata o Esc (e o fullscreenchange
  // já desliga o telão); aqui só cobre o caso de não estar em tela cheia.
  if (e.key === "Escape" && noTelao && !document.fullscreenElement) alternarTelao();
});

// ===================== GRÁFICO DOS 21 DIAS =====================

function montarGraficoJejum(totaisPorDia){
  const wrap = $("grafico-jejum");
  const maior = Math.max(1, ...totaisPorDia);
  const hoje = diaAtualEstimado();
  wrap.innerHTML = "";

  for (let d = 1; d <= JEJUM_DIAS; d++){
    const total = totaisPorDia[d - 1] || 0;
    const altura = Math.round((total / maior) * 100);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "barra-dia"
      + (escopoAtual !== "todos" && d === diaPainel ? " ativa" : "")
      + (d === hoje ? " hoje" : "")
      + (total === 0 ? " vazia" : "");
    b.setAttribute("aria-label", `Dia ${d}, ${dataFromDia(d)}: ${formatarMinutos(total)}`);
    b.innerHTML = `
      <span class="barra-valor">${formatarMinutos(total)}</span>
      <span class="barra-trilho"><span class="barra-preenchimento" style="height:${altura}%"></span></span>
      <span class="barra-num">${d}</span>
    `;
    b.addEventListener("click", () => irParaDia(d));
    wrap.appendChild(b);
  }
}

$("btn-atualizar").addEventListener("click", carregarPainel);

// =====================================================================
// RESUMO — calcula uma vez e alimenta o painel e o telão
// =====================================================================

function montarResumo(redes, escopo){
  const resumo = {
    totalGeral: 0,
    porCategoria: {},
    redes: [],
    celulas: [],
    totaisPorDia: new Array(JEJUM_DIAS).fill(0)
  };

  redes.forEach(rede => {
    let totalRede = 0;
    const celulas = (rede.celulas || []).map(celula => {
      let totalCelula = 0;
      const membros = (celula.membros || []).map(m => {
        const min = somaRegistros(m.registros || [], escopo);
        totalCelula += min;
        (m.registros || []).forEach(r => {
          if (r.dia >= 1 && r.dia <= JEJUM_DIAS) resumo.totaisPorDia[r.dia - 1] += (r.minutos || 0);
        });
        return { id: m.id, nome: m.nome, minutos: min };
      }).sort((a, b) => b.minutos - a.minutos || String(a.nome).localeCompare(String(b.nome)));

      totalRede += totalCelula;
      const item = {
        id: celula.id, nome: celula.nome, total: totalCelula,
        membros, redeNome: rede.nome, redeId: rede.id, categoria: rede.categoria
      };
      resumo.celulas.push(item);
      return item;
    }).sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome)));

    resumo.totalGeral += totalRede;
    resumo.porCategoria[rede.categoria] = (resumo.porCategoria[rede.categoria] || 0) + totalRede;
    resumo.redes.push({
      id: rede.id, nome: rede.nome, categoria: rede.categoria,
      total: totalRede, celulas,
      qtdMembros: (rede.celulas || []).reduce((acc, c) => acc + (c.membros || []).length, 0)
    });
  });

  resumo.redes.sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome)));
  resumo.celulas.sort((a, b) => b.total - a.total || String(a.nome).localeCompare(String(b.nome)));
  return resumo;
}

// ===================== RENDER: PAINEL GERAL =====================

async function carregarPainel(){
  const cont = $("painel-conteudo");
  if (primeiraCargaPainel){
    cont.innerHTML = `<div class="skeleton-bloco"></div><div class="skeleton-bloco"></div>`;
  }

  const redes = await buscarTodasRedes();
  redesCache = redes;
  const resumo = montarResumo(redes, escopoAtual);
  ultimoResumo = resumo;

  const categorias = ["Jovens", "Adolescentes"];
  cont.innerHTML = "";

  for (const categoria of categorias){
    const redesCategoria = resumo.redes.filter(r => r.categoria === categoria);
    if (redesCategoria.length === 0) continue;

    const blocoCategoria = document.createElement("div");
    blocoCategoria.className = "categoria-bloco";
    blocoCategoria.innerHTML = `<h2 class="categoria-titulo ${categoria.toLowerCase()}">${categoria}</h2>`;

    for (const rede of redesCategoria){
      const redeBloco = document.createElement("div");
      redeBloco.className = `rede-bloco ${categoria.toLowerCase()}`;

      const celulasHtml = rede.celulas.map(celula => {
        const chaveCel = `cel:${rede.id}:${celula.id}`;
        const membrosHtml = celula.membros.map(m => `
          <span class="membro-item${m.minutos === 0 ? " zerado" : " destaque"}">
            <span>${escapar(m.nome)}</span>
            <span class="valor">${formatarMinutos(m.minutos)}</span>
          </span>`).join("");
        return `
          <details class="celula-detalhe" data-chave="${chaveCel}" ${abertosPainel.has(chaveCel) ? "open" : ""}>
            <summary>
              <span class="celula-seta" aria-hidden="true"></span>
              <span class="celula-nome-painel">${escapar(celula.nome)}</span>
              <span class="celula-qtd">${celula.membros.length}</span>
              <span class="celula-total-painel">${formatarMinutos(celula.total)}</span>
            </summary>
            <div class="membros-grade">${membrosHtml || '<span class="membro-item zerado">Nenhum membro cadastrado</span>'}</div>
          </details>`;
      }).join("");

      const logo = logoDaRede(rede.id);
      const logoHtml = logo ? `<img class="rede-logo" src="${logo}" alt="${escapar(rede.nome)}">` : "";
      const chaveRede = `rede:${rede.id}`;

      redeBloco.innerHTML = `
        <div class="rede-cabecalho">
          <span class="rede-nome-grupo">${logoHtml}<span class="rede-nome">${escapar(rede.nome)}</span></span>
          <span class="rede-total num">${formatarMinutos(rede.total)}</span>
        </div>
        <div class="rede-barra"><div class="rede-barra-preenchimento" style="width:0%"></div></div>
        <details class="rede-detalhe" data-chave="${chaveRede}" ${abertosPainel.has(chaveRede) ? "open" : ""}>
          <summary>${rede.qtdMembros ? `Células e membros (${rede.qtdMembros})` : "Nenhum membro cadastrado"}</summary>
          ${celulasHtml || '<p class="membro-item zerado">Nenhuma célula cadastrada ainda.</p>'}
        </details>
      `;
      redeBloco.dataset.totalRede = rede.total;
      blocoCategoria.appendChild(redeBloco);
    }
    cont.appendChild(blocoCategoria);
  }

  // Lembra quais blocos o usuário abriu/fechou
  cont.querySelectorAll("details[data-chave]").forEach(d => {
    d.addEventListener("toggle", () => {
      if (d.open) abertosPainel.add(d.dataset.chave);
      else abertosPainel.delete(d.dataset.chave);
    });
  });

  const maiorTotalRede = Math.max(1, ...Array.from(cont.querySelectorAll(".rede-bloco")).map(b => Number(b.dataset.totalRede)));
  cont.querySelectorAll(".rede-bloco").forEach(bloco => {
    const total = Number(bloco.dataset.totalRede);
    const barra = bloco.querySelector(".rede-barra-preenchimento");
    requestAnimationFrame(() => { barra.style.width = `${Math.round((total / maiorTotalRede) * 100)}%`; });
  });

  montarComparativoCategorias(resumo.porCategoria);
  montarGraficoJejum(resumo.totaisPorDia);

  animarValor($("total-geral-valor"), primeiraCargaPainel ? resumo.totalGeral : ultimoTotalGeral, resumo.totalGeral);
  ultimoTotalGeral = resumo.totalGeral;
  primeiraCargaPainel = false;

  const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("hora-atualizacao").textContent = agora;
  $("telao-atualizado").textContent = `Atualizado às ${agora}`;

  renderizarTelao();
}

function montarComparativoCategorias(totalPorCategoria){
  const wrap = $("comparativo-categorias");
  const entradas = Object.entries(totalPorCategoria);
  if (entradas.length < 2){ wrap.classList.add("oculto"); return; }
  wrap.classList.remove("oculto");
  const maior = Math.max(1, ...entradas.map(([, v]) => v));
  wrap.innerHTML = entradas.map(([nome, valor]) => `
    <div class="comparativo-linha">
      <span class="comparativo-nome">${escapar(nome)}</span>
      <div class="comparativo-trilho"><div class="comparativo-preenchimento ${nome.toLowerCase()}" style="width:${Math.round((valor / maior) * 100)}%"></div></div>
      <span class="comparativo-valor">${formatarMinutos(valor)}</span>
    </div>
  `).join("");
}

// ===================== EXPANDIR / RECOLHER TUDO =====================

$("btn-expandir-tudo").addEventListener("click", () => {
  document.querySelectorAll("#painel-conteudo details[data-chave]").forEach(d => {
    d.open = true;
    abertosPainel.add(d.dataset.chave);
  });
});
$("btn-recolher-tudo").addEventListener("click", () => {
  document.querySelectorAll("#painel-conteudo details[data-chave]").forEach(d => {
    d.open = false;
    abertosPainel.delete(d.dataset.chave);
  });
});

// =====================================================================
// MODO TELÃO — dashboard de projeção
// Mostra, ao mesmo tempo: total geral, Jovens x Adolescentes, ranking das
// redes, ranking das células (paginado quando há muitas) e a linha dos
// 21 dias no rodapé.
// =====================================================================

const CELULAS_POR_PAGINA = 6;
let paginaCelulas = 0;
let telaoRotacaoTimer = null;
let telaoRelogioTimer = null;

function renderizarTelao(){
  if (!ultimoResumo) return;
  const r = ultimoResumo;

  $("telao-dia").textContent = escopoAtual === "todos" ? `1–${JEJUM_DIAS}` : `${diaPainel} / ${JEJUM_DIAS}`;
  $("telao-hero-rotulo").textContent = escopoAtual === "todos"
    ? `Total de oração — jejum inteiro`
    : `Total de oração — Dia ${diaPainel} (${dataFromDia(diaPainel)})`;
  $("telao-hero-valor").textContent = formatarMinutos(r.totalGeral);

  // Jovens x Adolescentes no topo
  const lado = $("telao-hero-lado");
  lado.innerHTML = Object.entries(r.porCategoria).map(([nome, valor]) => `
    <div class="telao-mini ${nome.toLowerCase()}">
      <span class="rotulo">${escapar(nome)}</span>
      <span class="valor">${formatarMinutos(valor)}</span>
    </div>`).join("");

  // Ranking das redes
  const maiorRede = Math.max(1, ...r.redes.map(x => x.total));
  $("telao-redes").innerHTML = r.redes.length ? r.redes.map((rede, i) => `
    <div class="telao-linha ${i === 0 && rede.total > 0 ? "top1" : ""}">
      <span class="telao-pos">${i + 1}</span>
      <div class="telao-linha-meio">
        <div class="telao-linha-nome">${escapar(rede.nome)} <span class="sub">${escapar(rede.categoria)}</span></div>
        <div class="telao-trilho"><div class="telao-preenchimento ${rede.categoria.toLowerCase()}" style="width:${Math.round((rede.total / maiorRede) * 100)}%"></div></div>
      </div>
      <span class="telao-linha-valor">${formatarMinutos(rede.total)}</span>
    </div>`).join("") : `<p class="telao-vazio">Nenhuma rede cadastrada.</p>`;

  renderizarTelaoCelulas();
  renderizarTelaoGrafico();
}

function renderizarTelaoCelulas(){
  if (!ultimoResumo) return;
  const todas = ultimoResumo.celulas;
  const wrap = $("telao-celulas");
  const rotulo = $("telao-celulas-pagina");

  if (!todas.length){
    wrap.innerHTML = `<p class="telao-vazio">Nenhuma célula cadastrada ainda.</p>`;
    rotulo.textContent = "";
    return;
  }

  const paginas = Math.ceil(todas.length / CELULAS_POR_PAGINA);
  if (paginaCelulas >= paginas) paginaCelulas = 0;
  rotulo.textContent = paginas > 1 ? `${paginaCelulas + 1}/${paginas}` : "";

  const inicio = paginaCelulas * CELULAS_POR_PAGINA;
  const fatia = todas.slice(inicio, inicio + CELULAS_POR_PAGINA);
  const maior = Math.max(1, ...todas.map(c => c.total));

  wrap.innerHTML = fatia.map((c, i) => {
    const pos = inicio + i + 1;
    return `
    <div class="telao-linha ${pos === 1 && c.total > 0 ? "top1" : ""}">
      <span class="telao-pos">${pos}</span>
      <div class="telao-linha-meio">
        <div class="telao-linha-nome">${escapar(c.nome)} <span class="sub">${escapar(c.redeNome)}</span></div>
        <div class="telao-trilho"><div class="telao-preenchimento ${c.categoria.toLowerCase()}" style="width:${Math.round((c.total / maior) * 100)}%"></div></div>
      </div>
      <span class="telao-linha-valor">${formatarMinutos(c.total)}</span>
    </div>`;
  }).join("");
}

function renderizarTelaoGrafico(){
  if (!ultimoResumo) return;
  const totais = ultimoResumo.totaisPorDia;
  const maior = Math.max(1, ...totais);
  const hoje = diaAtualEstimado();
  $("telao-grafico").innerHTML = Array.from({ length: JEJUM_DIAS }, (_, i) => {
    const d = i + 1;
    const total = totais[i] || 0;
    const ativa = escopoAtual !== "todos" && d === diaPainel;
    return `
      <div class="telao-barra ${ativa ? "ativa" : ""} ${d === hoje ? "hoje" : ""}" title="Dia ${d}: ${formatarMinutos(total)}">
        <div class="telao-barra-trilho"><div class="telao-barra-preench" style="height:${Math.round((total / maior) * 100)}%"></div></div>
        <span class="telao-barra-num">${d}</span>
      </div>`;
  }).join("");
}

function atualizarRelogioTelao(){
  const agora = new Date();
  $("telao-relogio").textContent = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("telao-data").textContent = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function alternarTelao(){
  const ativo = document.body.classList.toggle("telao");
  const btn = $("btn-telao");
  btn.textContent = ativo ? "Sair do telão" : "Modo telão";
  $("telao-tela").setAttribute("aria-hidden", ativo ? "false" : "true");

  if (ativo){
    renderizarTelao();
    atualizarRelogioTelao();
    telaoRelogioTimer = setInterval(atualizarRelogioTelao, 20000);
    // Passa sozinho as páginas de células, quando há mais do que cabe na tela
    telaoRotacaoTimer = setInterval(() => {
      const paginas = Math.ceil((ultimoResumo?.celulas.length || 0) / CELULAS_POR_PAGINA);
      if (paginas > 1){ paginaCelulas = (paginaCelulas + 1) % paginas; renderizarTelaoCelulas(); }
    }, 12000);
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    clearInterval(telaoRelogioTimer); telaoRelogioTimer = null;
    clearInterval(telaoRotacaoTimer); telaoRotacaoTimer = null;
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }
}

$("btn-telao").addEventListener("click", alternarTelao);

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && document.body.classList.contains("telao")){
    alternarTelao();
  }
});

// ===================== LOGIN DO DISCIPULADOR =====================

async function popularSelectRedesLogin(){
  const sel = $("login-rede");
  const redesSnap = await getDocs(collection(db, "redes"));
  sel.innerHTML = "";

  const optAdmin = document.createElement("option");
  optAdmin.value = ADMIN_VALOR_SELECT;
  optAdmin.textContent = "🔑 Acesso administrador (todas as redes)";
  sel.appendChild(optAdmin);

  redesSnap.docs
    .sort((a,b) => a.data().nome.localeCompare(b.data().nome))
    .forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = `${d.data().nome} (${d.data().categoria})`;
      sel.appendChild(opt);
    });
}

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const valorSelecionado = $("login-rede").value;
  const pin = $("login-pin").value.trim();
  const erroEl = $("login-erro");
  erroEl.classList.add("oculto");

  if (valorSelecionado === ADMIN_VALOR_SELECT){
    const snap = await getDoc(doc(db, "config", "admin"));
    const pinValido = snap.exists() ? String(snap.data().pin) : ADMIN_PIN_PADRAO;
    if (pin !== pinValido){ erroEl.classList.remove("oculto"); return; }
    sessionStorage.setItem("redeLogadaId", ADMIN_VALOR_SELECT);
    await entrarComoMestre();
    $("login-pin").value = "";
    return;
  }

  const snap = await getDoc(doc(db, "redes", valorSelecionado));
  if (!snap.exists() || String(snap.data().pin) !== pin){ erroEl.classList.remove("oculto"); return; }

  sessionStorage.setItem("redeLogadaId", valorSelecionado);
  await entrarComoRede(valorSelecionado, snap.data());
  $("login-pin").value = "";
});

function aplicarLogoAdmin(redeId, nome){
  const logo = logoDaRede(redeId);
  const logoEl = $("admin-logo");
  if (logo){
    logoEl.src = logo;
    logoEl.alt = nome;
    logoEl.classList.remove("oculto");
  } else {
    logoEl.classList.add("oculto");
  }
}

async function entrarComoRede(redeId, dados){
  modoMestre = false;
  redeLogada = { id: redeId, ...dados };
  $("login-box").classList.add("oculto");
  $("admin-box").classList.remove("oculto");
  $("admin-nome-rede").textContent = redeLogada.nome;
  $("admin-categoria").textContent = redeLogada.categoria;
  $("seletor-rede-mestre-wrap").classList.add("oculto");
  $("gerenciar-pins-wrap").classList.add("oculto");
  aplicarLogoAdmin(redeId, redeLogada.nome);
  resetarDiaLancamento();
  await carregarAdmin();
}

async function entrarComoMestre(){
  modoMestre = true;
  const redesSnap = await getDocs(collection(db, "redes"));
  const listaRedes = redesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b) => a.nome.localeCompare(b.nome));

  if (listaRedes.length === 0){ toast("Nenhuma rede cadastrada ainda.", "erro"); return; }

  const sel = $("seletor-rede-mestre");
  sel.innerHTML = listaRedes.map(r => `<option value="${r.id}">${escapar(r.nome)} (${escapar(r.categoria)})</option>`).join("");
  sessionStorage.setItem("mestreRedeAtual", listaRedes[0].id);

  $("login-box").classList.add("oculto");
  $("admin-box").classList.remove("oculto");
  $("seletor-rede-mestre-wrap").classList.remove("oculto");
  $("gerenciar-pins-wrap").classList.remove("oculto");
  $("admin-logo").classList.add("oculto");

  montarGerenciadorPins(listaRedes);
  await selecionarRedeNoMestre(listaRedes[0].id);
}

async function selecionarRedeNoMestre(redeId){
  const snap = await getDoc(doc(db, "redes", redeId));
  if (!snap.exists()) return;
  const dados = snap.data();
  redeLogada = { id: redeId, ...dados };
  sessionStorage.setItem("mestreRedeAtual", redeId);

  $("admin-nome-rede").textContent = dados.nome;
  $("admin-categoria").textContent = `${dados.categoria} · modo administrador`;
  aplicarLogoAdmin(redeId, dados.nome);

  resetarDiaLancamento();
  await carregarAdmin();
}

$("seletor-rede-mestre").addEventListener("change", async (e) => {
  await selecionarRedeNoMestre(e.target.value);
});

function montarGerenciadorPins(listaRedes){
  const wrap = $("gerenciar-pins-lista");
  wrap.innerHTML = listaRedes.map(r => `
    <form class="gerenciar-pins-linha" data-rede-id="${r.id}">
      <span>${escapar(r.nome)}</span>
      <input type="password" inputmode="numeric" placeholder="Novo PIN" class="gerenciar-pin-input" required>
      <button type="submit" class="botao botao-pequeno botao-secundario">Salvar</button>
    </form>
  `).join("");

  wrap.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = form.querySelector(".gerenciar-pin-input");
      const novoPin = input.value.trim();
      if (!novoPin) return;
      await updateDoc(doc(db, "redes", form.dataset.redeId), { pin: novoPin });
      input.value = "";
      toast("PIN da rede atualizado.");
    });
  });
}

$("form-admin-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoPin = $("novo-pin-admin").value.trim();
  if (!novoPin) return;
  await setDoc(doc(db, "config", "admin"), { pin: novoPin }, { merge: true });
  $("novo-pin-admin").value = "";
  toast("PIN administrador atualizado.");
});

$("btn-sair").addEventListener("click", () => {
  redeLogada = null;
  modoMestre = false;
  sessionStorage.removeItem("redeLogadaId");
  sessionStorage.removeItem("mestreRedeAtual");
  $("admin-box").classList.add("oculto");
  $("login-box").classList.remove("oculto");
});

$("form-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoPin = $("novo-pin").value.trim();
  if (!novoPin) return;
  await updateDoc(doc(db, "redes", redeLogada.id), { pin: novoPin });
  $("novo-pin").value = "";
  toast("PIN atualizado.");
});

// ===================== DIA DE LANÇAMENTO =====================

function resetarDiaLancamento(){
  diaLancamento = diaAtualEstimado();
  atualizarRotuloDiaLancamento();
}

function atualizarRotuloDiaLancamento(){
  $("dia-lanc-num").textContent = `Dia ${diaLancamento}`;
  $("dia-lanc-data").textContent = dataFromDia(diaLancamento);
  $("dia-lanc-prev").disabled = diaLancamento <= 1;
  $("dia-lanc-next").disabled = diaLancamento >= JEJUM_DIAS;
}

$("dia-lanc-prev").addEventListener("click", () => {
  if (diaLancamento > 1){ diaLancamento--; atualizarRotuloDiaLancamento(); }
});
$("dia-lanc-next").addEventListener("click", () => {
  if (diaLancamento < JEJUM_DIAS){ diaLancamento++; atualizarRotuloDiaLancamento(); }
});
$("dia-lanc-hoje").addEventListener("click", () => {
  diaLancamento = diaAtualEstimado();
  atualizarRotuloDiaLancamento();
});

// ===================== ADMIN: CÉLULAS / MEMBROS / REGISTROS =====================

$("form-celula").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("nome-celula");
  const nome = input.value.trim();
  if (!nome) return;
  await addDoc(collection(db, "redes", redeLogada.id, "celulas"), { nome });
  input.value = "";
  await carregarAdmin();
  toast(`Célula "${nome}" adicionada.`);
});

function montarNavCelulas(celulas){
  const nav = $("celulas-nav");
  if (!celulas.length){ nav.classList.add("oculto"); nav.innerHTML = ""; return; }
  nav.classList.remove("oculto");
  nav.innerHTML = `<span class="celulas-nav-rotulo">Ir para a célula</span>` + celulas.map(c => `
    <button type="button" class="chip-celula" data-ir="${c.id}">
      ${escapar(c.nome)}
      <span class="chip-tempo">${formatarMinutos(c.total)}</span>
    </button>`).join("");

  nav.querySelectorAll("[data-ir]").forEach(btn => {
    btn.addEventListener("click", () => {
      const alvo = document.querySelector(`.celula-admin[data-celula-id="${btn.dataset.ir}"]`);
      if (!alvo) return;
      alvo.open = true;
      abertosAdmin.add(btn.dataset.ir);
      alvo.scrollIntoView({ behavior: reduzMovimento ? "auto" : "smooth", block: "start" });
      alvo.classList.remove("piscando");
      void alvo.offsetWidth;
      alvo.classList.add("piscando");
      nav.querySelectorAll(".chip-celula").forEach(b => b.classList.remove("alvo"));
      btn.classList.add("alvo");
    });
  });
}

async function carregarAdmin(){
  atualizarRotuloDiaLancamento();
  const celulas = await buscarUmaRede(redeLogada.id);
  const lista = $("lista-celulas");
  const tplCelula = $("tpl-celula-admin");
  const tplMembro = $("tpl-membro-admin");
  const tplRegistro = $("tpl-registro-item");

  lista.innerHTML = "";

  const resumoCelulas = [];

  for (const celula of celulas){
    const noCelula = tplCelula.content.cloneNode(true);
    const elCelula = noCelula.querySelector(".celula-admin");
    elCelula.dataset.celulaId = celula.id;
    if (abertosAdmin.has(celula.id)) elCelula.open = true;
    elCelula.addEventListener("toggle", () => {
      if (elCelula.open) abertosAdmin.add(celula.id);
      else abertosAdmin.delete(celula.id);
    });

    noCelula.querySelector(".nome-celula").textContent = celula.nome;

    const totalCelula = celula.membros.reduce((acc, m) => acc + somaRegistros(m.registros, "todos"), 0);
    noCelula.querySelector(".celula-total").textContent = formatarMinutos(totalCelula);
    resumoCelulas.push({ id: celula.id, nome: celula.nome, total: totalCelula });

    const formMembro = noCelula.querySelector(".form-membro");
    formMembro.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = formMembro.querySelector(".nome-membro");
      const nome = input.value.trim();
      if (!nome) return;
      abertosAdmin.add(celula.id);
      await addDoc(collection(db, "redes", redeLogada.id, "celulas", celula.id, "membros"), { nome });
      await carregarAdmin();
      toast(`${nome} adicionado à célula.`);
    });

    const listaMembros = noCelula.querySelector(".lista-membros");
    for (const membro of celula.membros){
      const noMembro = tplMembro.content.cloneNode(true);
      noMembro.querySelector(".membro-nome").textContent = membro.nome;
      const totalMembro = somaRegistros(membro.registros, "todos");
      const elTotalMembro = noMembro.querySelector(".membro-total");
      elTotalMembro.textContent = formatarMinutos(totalMembro);
      if (totalMembro === 0) elTotalMembro.classList.add("zerado");

      const formRegistro = noMembro.querySelector(".form-registro");
      formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dia = diaLancamento;
        const horas = Number(formRegistro.querySelector(".registro-horas").value) || 0;
        const minutos = Number(formRegistro.querySelector(".registro-minutos").value) || 0;
        const totalMin = horas * 60 + minutos;
        if (totalMin <= 0) return;
        abertosAdmin.add(celula.id);
        await addDoc(
          collection(db, "redes", redeLogada.id, "celulas", celula.id, "membros", membro.id, "registros"),
          { dia, data: dataFromDia(dia), minutos: totalMin, criadoEm: serverTimestamp() }
        );
        await carregarAdmin();
        toast(`Lançado para ${membro.nome}: ${formatarMinutos(totalMin)} no Dia ${dia}.`);
      });

      // Cronômetro
      const btnCrono = noMembro.querySelector(".crono-botao");
      const elCrono = noMembro.querySelector(".crono-tempo");
      let cronoInicio = null;
      let cronoTimer = null;

      btnCrono.addEventListener("click", () => {
        if (cronoTimer){
          clearInterval(cronoTimer);
          cronoTimer = null;
          const decorridos = Math.round((Date.now() - cronoInicio) / 1000);
          const totalMin = Math.max(1, Math.round(decorridos / 60));
          formRegistro.querySelector(".registro-horas").value = Math.floor(totalMin / 60) || "";
          formRegistro.querySelector(".registro-minutos").value = totalMin % 60;
          btnCrono.textContent = "Cronômetro";
          btnCrono.classList.remove("rodando");
          elCrono.classList.add("oculto");
          toast(`${formatarMinutos(totalMin)} marcados. Confira e clique em Lançar.`);
          return;
        }
        cronoInicio = Date.now();
        btnCrono.textContent = "Parar e preencher";
        btnCrono.classList.add("rodando");
        elCrono.classList.remove("oculto");
        elCrono.textContent = "00:00";
        cronoTimer = setInterval(() => {
          const s = Math.floor((Date.now() - cronoInicio) / 1000);
          elCrono.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
        }, 1000);
      });

      const listaRegistros = noMembro.querySelector(".lista-registros");
      membro.registros
        .slice()
        .sort((a,b) => a.dia - b.dia)
        .forEach(reg => {
          const noReg = tplRegistro.content.cloneNode(true);
          noReg.querySelector(".registro-item-dia").textContent = `Dia ${reg.dia} — ${reg.data}`;
          noReg.querySelector(".registro-item-tempo").textContent = formatarMinutos(reg.minutos);
          noReg.querySelector(".registro-item-excluir").addEventListener("click", async () => {
            const ok = await confirmarModal(`Excluir o lançamento do Dia ${reg.dia} de ${membro.nome}?`);
            if (!ok) return;
            abertosAdmin.add(celula.id);
            await deleteDoc(doc(db, "redes", redeLogada.id, "celulas", celula.id, "membros", membro.id, "registros", reg.id));
            await carregarAdmin();
            toast("Lançamento excluído.");
          });
          listaRegistros.appendChild(noReg);
        });

      listaMembros.appendChild(noMembro);
    }

    lista.appendChild(noCelula);
  }

  montarNavCelulas(resumoCelulas);
}

// ===================== INICIALIZAÇÃO =====================

async function iniciar(){
  temaPref = lerTemaPref();
  aplicarTema();

  atualizarEscopo();
  atualizarRotuloDiaLancamento();
  atualizarRelogioTelao();

  await verificarSeed();
  await carregarPainel();
  await popularSelectRedesLogin();

  autoRefreshTimer = setInterval(carregarPainel, 20000);

  const redeSalva = sessionStorage.getItem("redeLogadaId");
  if (redeSalva === ADMIN_VALOR_SELECT){
    await entrarComoMestre();
    const redeMestreSalva = sessionStorage.getItem("mestreRedeAtual");
    if (redeMestreSalva){
      $("seletor-rede-mestre").value = redeMestreSalva;
      await selecionarRedeNoMestre(redeMestreSalva);
    }
  } else if (redeSalva){
    const snap = await getDoc(doc(db, "redes", redeSalva));
    if (snap.exists()) await entrarComoRede(redeSalva, snap.data());
  }
}

iniciar();
