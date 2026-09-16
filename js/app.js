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

// ===================== UTIL =====================

function pad(n){ return String(n).padStart(2, "0"); }

function dataFromDia(diaNumero){
  const inicio = new Date(JEJUM_INICIO + "T00:00:00");
  const d = new Date(inicio);
  d.setDate(d.getDate() + (diaNumero - 1));
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

const reduzMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Anima um número (em minutos) dentro de um elemento, formatando com formatarMinutos.
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
    const atual = Math.round(deValor + (paraValor - deValor) * suavizado);
    el.textContent = formatarMinutos(atual);
    if (t < 1) requestAnimationFrame(passo);
  }
  requestAnimationFrame(passo);
}

// ===================== TOASTS =====================

function toast(mensagem, tipo = "ok"){
  const cont = document.getElementById("toast-container");
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
    const modal = document.getElementById("modal-confirmar");
    document.getElementById("modal-confirmar-texto").textContent = texto;
    const btnOk = document.getElementById("modal-confirmar-ok");
    const btnCancelar = document.getElementById("modal-cancelar");
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

let escopoAtual = diaAtualEstimado(); // número do dia, ou "todos"
let redeLogada = null; // { id, nome, categoria }
let modoMestre = false; // true quando logado com o PIN administrador
let redesCache = []; // últimas redes conhecidas (para o seletor mestre)
let diaLancamento = diaAtualEstimado(); // dia usado ao lançar tempo de oração
let ultimoTotalGeral = 0;
let autoRefreshTimer = null;
let primeiraCargaPainel = true;

// ===================== NAVEGAÇÃO ENTRE ABAS =====================

document.getElementById("abas").addEventListener("click", (e) => {
  const btn = e.target.closest(".aba");
  if (!btn) return;
  document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("ativo"));
  btn.classList.add("ativa");
  document.getElementById(`tab-${btn.dataset.aba}`).classList.add("ativo");
});

// ===================== CABEÇALHO =====================

document.getElementById("jejum-tema").textContent = `Jejum de ${JEJUM_DIAS} dias — ${JEJUM_TEMA}`;
document.getElementById("logo-igreja").alt = IGREJA_NOME;
document.getElementById("logo-igreja").src = IGREJA_LOGO;

// ===================== BUSCA DE DADOS =====================

async function buscarTodasRedes(){
  const redesSnap = await getDocs(collection(db, "redes"));
  const redes = await Promise.all(redesSnap.docs.map(async (redeDoc) => {
    const celulasSnap = await getDocs(collection(db, "redes", redeDoc.id, "celulas"));
    const celulas = await Promise.all(celulasSnap.docs.map(async (celDoc) => {
      const membrosSnap = await getDocs(collection(db, "redes", redeDoc.id, "celulas", celDoc.id, "membros"));
      const membros = await Promise.all(membrosSnap.docs.map(async (memDoc) => {
        const regSnap = await getDocs(collection(db, "redes", redeDoc.id, "celulas", celDoc.id, "membros", memDoc.id, "registros"));
        return { id: memDoc.id, ...memDoc.data(), registros: regSnap.docs.map(d => ({ id: d.id, ...d.data() })) };
      }));
      return { id: celDoc.id, ...celDoc.data(), membros };
    }));
    return { id: redeDoc.id, ...redeDoc.data(), celulas };
  }));
  return redes;
}

async function buscarUmaRede(redeId){
  const celulasSnap = await getDocs(collection(db, "redes", redeId, "celulas"));
  const celulas = await Promise.all(celulasSnap.docs.map(async (celDoc) => {
    const membrosSnap = await getDocs(collection(db, "redes", redeId, "celulas", celDoc.id, "membros"));
    const membros = await Promise.all(membrosSnap.docs.map(async (memDoc) => {
      const regSnap = await getDocs(collection(db, "redes", redeId, "celulas", celDoc.id, "membros", memDoc.id, "registros"));
      return { id: memDoc.id, ...memDoc.data(), registros: regSnap.docs.map(d => ({ id: d.id, ...d.data() })) };
    }));
    return { id: celDoc.id, ...celDoc.data(), membros };
  }));
  return celulas;
}

// ===================== SEED (configuração inicial das 6 redes) =====================

async function verificarSeed(){
  const redesSnap = await getDocs(collection(db, "redes"));
  document.getElementById("seed-aviso").classList.toggle("oculto", !redesSnap.empty);
}

document.getElementById("btn-seed").addEventListener("click", async () => {
  const btn = document.getElementById("btn-seed");
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
// Em vez de 21 botõezinhos lado a lado (que viravam um borrão na tela),
// um único dia por vez, com setas, e um botão para ver o jejum inteiro.

let diaPainel = diaAtualEstimado();

function atualizarEscopo(){
  const vendoTudo = escopoAtual === "todos";
  document.getElementById("escopo-dia").classList.toggle("desativado", vendoTudo);
  document.getElementById("escopo-dia-num").textContent = `Dia ${diaPainel}`;
  document.getElementById("escopo-dia-data").textContent = dataFromDia(diaPainel);
  document.getElementById("escopo-prev").disabled = vendoTudo || diaPainel <= 1;
  document.getElementById("escopo-next").disabled = vendoTudo || diaPainel >= JEJUM_DIAS;
  document.querySelectorAll(".escopo-op").forEach(b => {
    b.classList.toggle("ativa", (b.dataset.escopo === "todos") === vendoTudo);
  });
  document.getElementById("total-geral-rotulo").textContent =
    vendoTudo ? `de oração nos ${JEJUM_DIAS} dias` : `de oração no Dia ${diaPainel}`;
}

function irParaDia(d){
  diaPainel = Math.min(JEJUM_DIAS, Math.max(1, d));
  escopoAtual = diaPainel;
  atualizarEscopo();
  carregarPainel();
}

document.getElementById("escopo-prev").addEventListener("click", () => irParaDia(diaPainel - 1));
document.getElementById("escopo-next").addEventListener("click", () => irParaDia(diaPainel + 1));

document.querySelectorAll(".escopo-op").forEach(btn => {
  btn.addEventListener("click", () => {
    escopoAtual = btn.dataset.escopo === "todos" ? "todos" : diaPainel;
    atualizarEscopo();
    carregarPainel();
  });
});

// Setas do teclado navegam os dias (útil no telão, com o controle remoto
// de apresentação, que costuma mandar seta esquerda/direita).
document.addEventListener("keydown", (e) => {
  const digitando = ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName);
  if (digitando) return;
  if (!document.getElementById("tab-painel").classList.contains("ativo")) return;
  if (e.key === "ArrowLeft" && escopoAtual !== "todos") irParaDia(diaPainel - 1);
  if (e.key === "ArrowRight" && escopoAtual !== "todos") irParaDia(diaPainel + 1);
  if (e.key.toLowerCase() === "t") alternarTelao();
});

// ===================== GRÁFICO DOS 21 DIAS =====================
// Cada barra é o total orado naquele dia. Clicar numa barra troca o dia
// mostrado no painel — dá pra ver o jejum inteiro de relance e navegar
// pelo mesmo gesto.

function montarGraficoJejum(totaisPorDia){
  const wrap = document.getElementById("grafico-jejum");
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

document.getElementById("btn-atualizar").addEventListener("click", carregarPainel);

// ===================== RENDER: PAINEL GERAL =====================

async function carregarPainel(){
  const cont = document.getElementById("painel-conteudo");
  if (primeiraCargaPainel){
    cont.innerHTML = `<div class="skeleton-bloco"></div><div class="skeleton-bloco"></div>`;
  }

  const redes = await buscarTodasRedes();
  redesCache = redes;

  const categorias = ["Jovens", "Adolescentes"];
  cont.innerHTML = "";
  let totalGeral = 0;
  const totalPorCategoria = {};

  for (const categoria of categorias){
    const redesCategoria = redes.filter(r => r.categoria === categoria);
    if (redesCategoria.length === 0) continue;

    const blocoCategoria = document.createElement("div");
    blocoCategoria.className = "categoria-bloco";
    blocoCategoria.innerHTML = `<h2 class="categoria-titulo ${categoria.toLowerCase()}">${categoria}</h2>`;

    let totalCategoria = 0;

    for (const rede of redesCategoria){
      let totalRede = 0;
      const redeBloco = document.createElement("div");
      redeBloco.className = `rede-bloco ${categoria.toLowerCase()}`;

      const celulasHtml = rede.celulas.map(celula => {
        let totalCelula = 0;
        const membrosHtml = celula.membros.map(m => {
          const min = somaRegistros(m.registros, escopoAtual);
          totalCelula += min;
          return `<span class="membro-item${min === 0 ? " zerado" : ""}"><span>${m.nome}</span><span class="valor">${formatarMinutos(min)}</span></span>`;
        }).join("");
        totalRede += totalCelula;
        return `
          <div class="celula-linha">
            <div class="celula-cabecalho"><span>${celula.nome}</span><span>${formatarMinutos(totalCelula)}</span></div>
            <div class="membros-grade">${membrosHtml || '<span class="membro-item zerado">Nenhum membro cadastrado</span>'}</div>
          </div>`;
      }).join("");

      totalGeral += totalRede;
      totalCategoria += totalRede;

      const logo = logoDaRede(rede.id);
      const logoHtml = logo ? `<img class="rede-logo" src="${logo}" alt="${rede.nome}">` : "";

      const qtdMembros = rede.celulas.reduce((acc, c) => acc + c.membros.length, 0);

      redeBloco.innerHTML = `
        <div class="rede-cabecalho">
          <span class="rede-nome-grupo">${logoHtml}<span class="rede-nome">${rede.nome}</span></span>
          <span class="rede-total">${formatarMinutos(totalRede)}</span>
        </div>
        <div class="rede-barra"><div class="rede-barra-preenchimento" style="width:0%" data-alvo=""></div></div>
        <details class="rede-detalhe">
          <summary>${qtdMembros ? `Ver quem orou (${qtdMembros})` : "Nenhum membro cadastrado"}</summary>
          ${celulasHtml || '<p class="membro-item zerado">Nenhuma célula cadastrada ainda.</p>'}
        </details>
      `;
      redeBloco.dataset.totalRede = totalRede;
      blocoCategoria.appendChild(redeBloco);
    }
    totalPorCategoria[categoria] = totalCategoria;
    cont.appendChild(blocoCategoria);
  }

  // Preenche as barrinhas de cada rede proporcional ao maior total do painel,
  // depois que todos os totais já foram calculados.
  const maiorTotalRede = Math.max(1, ...Array.from(cont.querySelectorAll(".rede-bloco")).map(b => Number(b.dataset.totalRede)));
  cont.querySelectorAll(".rede-bloco").forEach(bloco => {
    const total = Number(bloco.dataset.totalRede);
    const barra = bloco.querySelector(".rede-barra-preenchimento");
    requestAnimationFrame(() => { barra.style.width = `${Math.round((total / maiorTotalRede) * 100)}%`; });
  });

  montarComparativoCategorias(totalPorCategoria);

  // Total de cada um dos dias do jejum, para o gráfico
  const totaisPorDia = new Array(JEJUM_DIAS).fill(0);
  redes.forEach(rede => rede.celulas.forEach(cel => cel.membros.forEach(m =>
    m.registros.forEach(r => {
      if (r.dia >= 1 && r.dia <= JEJUM_DIAS) totaisPorDia[r.dia - 1] += (r.minutos || 0);
    })
  )));
  montarGraficoJejum(totaisPorDia);

  const elTotalGeral = document.getElementById("total-geral-valor");
  animarValor(elTotalGeral, primeiraCargaPainel ? totalGeral : ultimoTotalGeral, totalGeral);
  ultimoTotalGeral = totalGeral;
  primeiraCargaPainel = false;

  document.getElementById("hora-atualizacao").textContent =
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function montarComparativoCategorias(totalPorCategoria){
  const wrap = document.getElementById("comparativo-categorias");
  const entradas = Object.entries(totalPorCategoria).filter(([, v]) => v !== undefined);
  if (entradas.length < 2){
    wrap.classList.add("oculto");
    return;
  }
  wrap.classList.remove("oculto");
  const maior = Math.max(1, ...entradas.map(([, v]) => v));
  wrap.innerHTML = entradas.map(([nome, valor]) => `
    <div class="comparativo-linha">
      <span class="comparativo-nome">${nome}</span>
      <div class="comparativo-trilho"><div class="comparativo-preenchimento ${nome.toLowerCase()}" style="width:${Math.round((valor / maior) * 100)}%"></div></div>
      <span class="comparativo-valor">${formatarMinutos(valor)}</span>
    </div>
  `).join("");
}

// ===================== MODO TELÃO =====================
// Para projetar durante o culto: esconde os controles de edição, aumenta
// tudo e entra em tela cheia. Sai com Esc ou apertando T de novo.

function alternarTelao(){
  const ativo = document.body.classList.toggle("telao");
  const btn = document.getElementById("btn-telao");
  btn.textContent = ativo ? "Sair do telão" : "Modo telão";
  if (ativo){
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else if (document.fullscreenElement){
    document.exitFullscreen?.().catch(() => {});
  }
}

document.getElementById("btn-telao").addEventListener("click", alternarTelao);

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && document.body.classList.contains("telao")){
    document.body.classList.remove("telao");
    document.getElementById("btn-telao").textContent = "Modo telão";
  }
});

// ===================== LOGIN DO DISCIPULADOR =====================

async function popularSelectRedesLogin(){
  const sel = document.getElementById("login-rede");
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

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const valorSelecionado = document.getElementById("login-rede").value;
  const pin = document.getElementById("login-pin").value.trim();
  const erroEl = document.getElementById("login-erro");
  erroEl.classList.add("oculto");

  if (valorSelecionado === ADMIN_VALOR_SELECT){
    const snap = await getDoc(doc(db, "config", "admin"));
    const pinValido = snap.exists() ? String(snap.data().pin) : ADMIN_PIN_PADRAO;
    if (pin !== pinValido){
      erroEl.textContent = "PIN incorreto. Tente novamente.";
      erroEl.classList.remove("oculto");
      return;
    }
    sessionStorage.setItem("redeLogadaId", ADMIN_VALOR_SELECT);
    await entrarComoMestre();
    document.getElementById("login-pin").value = "";
    return;
  }

  const snap = await getDoc(doc(db, "redes", valorSelecionado));
  if (!snap.exists() || String(snap.data().pin) !== pin){
    erroEl.textContent = "PIN incorreto. Tente novamente.";
    erroEl.classList.remove("oculto");
    return;
  }

  sessionStorage.setItem("redeLogadaId", valorSelecionado);
  await entrarComoRede(valorSelecionado, snap.data());
  document.getElementById("login-pin").value = "";
});

async function entrarComoRede(redeId, dados){
  modoMestre = false;
  redeLogada = { id: redeId, ...dados };
  document.getElementById("login-box").classList.add("oculto");
  document.getElementById("admin-box").classList.remove("oculto");
  document.getElementById("admin-nome-rede").textContent = redeLogada.nome;
  document.getElementById("admin-categoria").textContent = redeLogada.categoria;
  document.getElementById("seletor-rede-mestre-wrap").classList.add("oculto");
  document.getElementById("gerenciar-pins-wrap").classList.add("oculto");

  const logo = logoDaRede(redeId);
  const logoEl = document.getElementById("admin-logo");
  if (logo){
    logoEl.src = logo;
    logoEl.alt = redeLogada.nome;
    logoEl.classList.remove("oculto");
  } else {
    logoEl.classList.add("oculto");
  }

  resetarDiaLancamento();
  await carregarAdmin();
}

async function entrarComoMestre(){
  modoMestre = true;
  const redesSnap = await getDocs(collection(db, "redes"));
  const listaRedes = redesSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a,b) => a.nome.localeCompare(b.nome));

  if (listaRedes.length === 0){
    toast("Nenhuma rede cadastrada ainda.", "erro");
    return;
  }

  const sel = document.getElementById("seletor-rede-mestre");
  sel.innerHTML = listaRedes.map(r => `<option value="${r.id}">${r.nome} (${r.categoria})</option>`).join("");
  sessionStorage.setItem("mestreRedeAtual", listaRedes[0].id);

  document.getElementById("login-box").classList.add("oculto");
  document.getElementById("admin-box").classList.remove("oculto");
  document.getElementById("seletor-rede-mestre-wrap").classList.remove("oculto");
  document.getElementById("gerenciar-pins-wrap").classList.remove("oculto");
  document.getElementById("admin-logo").classList.add("oculto");

  montarGerenciadorPins(listaRedes);
  await selecionarRedeNoMestre(listaRedes[0].id, listaRedes);
}

async function selecionarRedeNoMestre(redeId, listaRedesConhecida){
  const snap = await getDoc(doc(db, "redes", redeId));
  if (!snap.exists()) return;
  const dados = snap.data();
  redeLogada = { id: redeId, ...dados };
  sessionStorage.setItem("mestreRedeAtual", redeId);

  document.getElementById("admin-nome-rede").textContent = dados.nome;
  document.getElementById("admin-categoria").textContent = `${dados.categoria} · modo administrador`;

  const logo = logoDaRede(redeId);
  const logoEl = document.getElementById("admin-logo");
  if (logo){
    logoEl.src = logo;
    logoEl.alt = dados.nome;
    logoEl.classList.remove("oculto");
  } else {
    logoEl.classList.add("oculto");
  }

  resetarDiaLancamento();
  await carregarAdmin();
}

document.getElementById("seletor-rede-mestre").addEventListener("change", async (e) => {
  await selecionarRedeNoMestre(e.target.value);
});

function montarGerenciadorPins(listaRedes){
  const wrap = document.getElementById("gerenciar-pins-lista");
  wrap.innerHTML = listaRedes.map(r => `
    <form class="gerenciar-pins-linha" data-rede-id="${r.id}">
      <span>${r.nome}</span>
      <input type="password" inputmode="numeric" placeholder="Novo PIN" class="gerenciar-pin-input" required>
      <button type="submit" class="botao botao-pequeno botao-secundario">Salvar</button>
    </form>
  `).join("");

  wrap.querySelectorAll("form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const redeId = form.dataset.redeId;
      const input = form.querySelector(".gerenciar-pin-input");
      const novoPin = input.value.trim();
      if (!novoPin) return;
      await updateDoc(doc(db, "redes", redeId), { pin: novoPin });
      input.value = "";
      toast(`PIN da rede atualizado.`);
    });
  });
}

document.getElementById("form-admin-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoPin = document.getElementById("novo-pin-admin").value.trim();
  if (!novoPin) return;
  await setDoc(doc(db, "config", "admin"), { pin: novoPin }, { merge: true });
  document.getElementById("novo-pin-admin").value = "";
  toast("PIN administrador atualizado.");
});

document.getElementById("btn-sair").addEventListener("click", () => {
  redeLogada = null;
  modoMestre = false;
  sessionStorage.removeItem("redeLogadaId");
  sessionStorage.removeItem("mestreRedeAtual");
  document.getElementById("admin-box").classList.add("oculto");
  document.getElementById("login-box").classList.remove("oculto");
});

document.getElementById("form-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoPin = document.getElementById("novo-pin").value.trim();
  if (!novoPin) return;
  await updateDoc(doc(db, "redes", redeLogada.id), { pin: novoPin });
  document.getElementById("novo-pin").value = "";
  toast("PIN atualizado.");
});

// ===================== DIA DE LANÇAMENTO (corrige o bug do seletor gigante) =====================
// Em vez de um <select> com 21 dias repetido em cada membro (que reiniciava
// para o dia atual a cada lançamento), existe um único seletor de dia no
// topo da área do discipulador. Ele é lembrado em memória e só muda quando
// o próprio discipulador navega — nunca "some" sozinho depois de lançar.

function resetarDiaLancamento(){
  diaLancamento = diaAtualEstimado();
  atualizarRotuloDiaLancamento();
}

function atualizarRotuloDiaLancamento(){
  document.getElementById("dia-lanc-num").textContent = `Dia ${diaLancamento}`;
  document.getElementById("dia-lanc-data").textContent = dataFromDia(diaLancamento);
  document.getElementById("dia-lanc-prev").disabled = diaLancamento <= 1;
  document.getElementById("dia-lanc-next").disabled = diaLancamento >= JEJUM_DIAS;
}

document.getElementById("dia-lanc-prev").addEventListener("click", () => {
  if (diaLancamento > 1){ diaLancamento--; atualizarRotuloDiaLancamento(); }
});
document.getElementById("dia-lanc-next").addEventListener("click", () => {
  if (diaLancamento < JEJUM_DIAS){ diaLancamento++; atualizarRotuloDiaLancamento(); }
});
document.getElementById("dia-lanc-hoje").addEventListener("click", () => {
  diaLancamento = diaAtualEstimado();
  atualizarRotuloDiaLancamento();
});

// ===================== ADMIN: CÉLULAS / MEMBROS / REGISTROS =====================

document.getElementById("form-celula").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("nome-celula");
  const nome = input.value.trim();
  if (!nome) return;
  await addDoc(collection(db, "redes", redeLogada.id, "celulas"), { nome });
  input.value = "";
  await carregarAdmin();
  toast(`Célula "${nome}" adicionada.`);
});

async function carregarAdmin(){
  atualizarRotuloDiaLancamento();
  const celulas = await buscarUmaRede(redeLogada.id);
  const lista = document.getElementById("lista-celulas");
  const tplCelula = document.getElementById("tpl-celula-admin");
  const tplMembro = document.getElementById("tpl-membro-admin");
  const tplRegistro = document.getElementById("tpl-registro-item");

  lista.innerHTML = "";

  for (const celula of celulas){
    const noCelula = tplCelula.content.cloneNode(true);
    noCelula.querySelector(".nome-celula").textContent = celula.nome;

    const totalCelula = celula.membros.reduce((acc, m) => acc + somaRegistros(m.registros, "todos"), 0);
    noCelula.querySelector(".celula-total").textContent = `Total do jejum: ${formatarMinutos(totalCelula)}`;

    const formMembro = noCelula.querySelector(".form-membro");
    formMembro.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = formMembro.querySelector(".nome-membro");
      const nome = input.value.trim();
      if (!nome) return;
      await addDoc(collection(db, "redes", redeLogada.id, "celulas", celula.id, "membros"), { nome });
      await carregarAdmin();
      toast(`${nome} adicionado à célula.`);
    });

    const listaMembros = noCelula.querySelector(".lista-membros");
    for (const membro of celula.membros){
      const noMembro = tplMembro.content.cloneNode(true);
      noMembro.querySelector(".membro-nome").textContent = membro.nome;
      noMembro.querySelector(".membro-total").textContent =
        `Total: ${formatarMinutos(somaRegistros(membro.registros, "todos"))}`;

      const formRegistro = noMembro.querySelector(".form-registro");
      formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dia = diaLancamento;
        const horas = Number(formRegistro.querySelector(".registro-horas").value) || 0;
        const minutos = Number(formRegistro.querySelector(".registro-minutos").value) || 0;
        const totalMin = horas * 60 + minutos;
        if (totalMin <= 0) return;
        await addDoc(
          collection(db, "redes", redeLogada.id, "celulas", celula.id, "membros", membro.id, "registros"),
          { dia, data: dataFromDia(dia), minutos: totalMin, criadoEm: serverTimestamp() }
        );
        await carregarAdmin();
        toast(`Lançado para ${membro.nome}: ${formatarMinutos(totalMin)} no Dia ${dia}.`);
      });

      // Cronômetro: marca o tempo de oração ao vivo e, ao parar, já
      // preenche os campos de horas/minutos — ninguém precisa olhar no
      // relógio e fazer conta.
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

      const listaRegistros = noMembro.querySelector(".lista-registros");      membro.registros
        .sort((a,b) => a.dia - b.dia)
        .forEach(reg => {
          const noReg = tplRegistro.content.cloneNode(true);
          noReg.querySelector(".registro-item-dia").textContent = `Dia ${reg.dia} — ${reg.data}`;
          noReg.querySelector(".registro-item-tempo").textContent = formatarMinutos(reg.minutos);
          noReg.querySelector(".registro-item-excluir").addEventListener("click", async () => {
            const ok = await confirmarModal(`Excluir o lançamento do Dia ${reg.dia} de ${membro.nome}?`);
            if (!ok) return;
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
}

// ===================== INICIALIZAÇÃO =====================

async function iniciar(){
  atualizarEscopo();
  atualizarRotuloDiaLancamento();
  await verificarSeed();
  await carregarPainel();
  await popularSelectRedesLogin();

  // Auto-atualiza o painel a cada 20s (útil para telão/projeção durante o culto)
  autoRefreshTimer = setInterval(carregarPainel, 20000);

  // Retoma sessão do discipulador, se ainda estiver marcada neste navegador
  const redeSalva = sessionStorage.getItem("redeLogadaId");
  if (redeSalva === ADMIN_VALOR_SELECT){
    await entrarComoMestre();
    const redeMestreSalva = sessionStorage.getItem("mestreRedeAtual");
    if (redeMestreSalva){
      document.getElementById("seletor-rede-mestre").value = redeMestreSalva;
      await selecionarRedeNoMestre(redeMestreSalva);
    }
  } else if (redeSalva){
    const snap = await getDoc(doc(db, "redes", redeSalva));
    if (snap.exists()){
      await entrarComoRede(redeSalva, snap.data());
    }
  }
}

iniciar();
