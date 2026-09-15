import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, addDoc, getDocs, getDoc,
  deleteDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, JEJUM_INICIO, JEJUM_DIAS, JEJUM_TEMA, REDES_PADRAO } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// ===================== ESTADO =====================

let escopoAtual = diaAtualEstimado(); // número do dia, ou "todos"
let redeLogada = null; // { id, nome, categoria }
let autoRefreshTimer = null;

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
document.getElementById("total-dias-label").textContent = JEJUM_DIAS;

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
  await verificarSeed();
  await carregarPainel();
  await popularSelectRedesLogin();
  btn.disabled = false;
  btn.textContent = "Configurar as 6 redes iniciais";
});

// ===================== ESCADA DE DIAS (painel) =====================

function montarEscadaDias(){
  const wrap = document.getElementById("dias-escada");
  wrap.innerHTML = "";
  for (let d = 1; d <= JEJUM_DIAS; d++){
    const b = document.createElement("button");
    b.className = "dia-degrau" + (d === escopoAtual ? " ativo" : "");
    b.innerHTML = `<strong>Dia ${d}</strong>${dataFromDia(d)}`;
    b.addEventListener("click", () => {
      escopoAtual = d;
      document.getElementById("chk-total-jejum").checked = false;
      montarEscadaDias();
      carregarPainel();
    });
    wrap.appendChild(b);
  }
}

document.getElementById("chk-total-jejum").addEventListener("change", (e) => {
  escopoAtual = e.target.checked ? "todos" : diaAtualEstimado();
  montarEscadaDias();
  carregarPainel();
});

document.getElementById("btn-atualizar").addEventListener("click", carregarPainel);

// ===================== RENDER: PAINEL GERAL =====================

async function carregarPainel(){
  const cont = document.getElementById("painel-conteudo");
  const redes = await buscarTodasRedes();

  const categorias = ["Jovens", "Adolescentes"];
  cont.innerHTML = "";
  let totalGeral = 0;

  for (const categoria of categorias){
    const redesCategoria = redes.filter(r => r.categoria === categoria);
    if (redesCategoria.length === 0) continue;

    const blocoCategoria = document.createElement("div");
    blocoCategoria.className = "categoria-bloco";
    blocoCategoria.innerHTML = `<h2 class="categoria-titulo ${categoria.toLowerCase()}">${categoria}</h2>`;

    for (const rede of redesCategoria){
      let totalRede = 0;
      const redeBloco = document.createElement("div");
      redeBloco.className = "rede-bloco";

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

      redeBloco.innerHTML = `
        <div class="rede-cabecalho">
          <span class="rede-nome">${rede.nome}</span>
          <span class="rede-total">${formatarMinutos(totalRede)}</span>
        </div>
        ${celulasHtml || '<p class="membro-item zerado">Nenhuma célula cadastrada ainda.</p>'}
      `;
      blocoCategoria.appendChild(redeBloco);
    }
    cont.appendChild(blocoCategoria);
  }

  document.getElementById("total-geral-valor").textContent = formatarMinutos(totalGeral);
  document.getElementById("hora-atualizacao").textContent =
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ===================== LOGIN DO DISCIPULADOR =====================

async function popularSelectRedesLogin(){
  const sel = document.getElementById("login-rede");
  const redesSnap = await getDocs(collection(db, "redes"));
  sel.innerHTML = "";
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
  const redeId = document.getElementById("login-rede").value;
  const pin = document.getElementById("login-pin").value.trim();
  const erroEl = document.getElementById("login-erro");
  erroEl.classList.add("oculto");

  const snap = await getDoc(doc(db, "redes", redeId));
  if (!snap.exists() || String(snap.data().pin) !== pin){
    erroEl.classList.remove("oculto");
    return;
  }

  redeLogada = { id: redeId, ...snap.data() };
  sessionStorage.setItem("redeLogadaId", redeId);
  document.getElementById("login-box").classList.add("oculto");
  document.getElementById("admin-box").classList.remove("oculto");
  document.getElementById("admin-nome-rede").textContent = redeLogada.nome;
  document.getElementById("admin-categoria").textContent = redeLogada.categoria;
  document.getElementById("login-pin").value = "";
  await carregarAdmin();
});

document.getElementById("btn-sair").addEventListener("click", () => {
  redeLogada = null;
  sessionStorage.removeItem("redeLogadaId");
  document.getElementById("admin-box").classList.add("oculto");
  document.getElementById("login-box").classList.remove("oculto");
});

document.getElementById("form-pin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const novoPin = document.getElementById("novo-pin").value.trim();
  if (!novoPin) return;
  await updateDoc(doc(db, "redes", redeLogada.id), { pin: novoPin });
  document.getElementById("novo-pin").value = "";
  alert("PIN atualizado.");
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
});

function opcoesDias(diaSelecionado){
  let html = "";
  for (let d = 1; d <= JEJUM_DIAS; d++){
    html += `<option value="${d}" ${d === diaSelecionado ? "selected" : ""}>Dia ${d} — ${dataFromDia(d)}</option>`;
  }
  return html;
}

async function carregarAdmin(){
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
    });

    const listaMembros = noCelula.querySelector(".lista-membros");
    for (const membro of celula.membros){
      const noMembro = tplMembro.content.cloneNode(true);
      noMembro.querySelector(".membro-nome").textContent = membro.nome;
      noMembro.querySelector(".membro-total").textContent =
        `Total: ${formatarMinutos(somaRegistros(membro.registros, "todos"))}`;

      const selectDia = noMembro.querySelector(".registro-dia");
      selectDia.innerHTML = opcoesDias(diaAtualEstimado());

      const formRegistro = noMembro.querySelector(".form-registro");
      formRegistro.addEventListener("submit", async (e) => {
        e.preventDefault();
        const dia = Number(formRegistro.querySelector(".registro-dia").value);
        const horas = Number(formRegistro.querySelector(".registro-horas").value) || 0;
        const minutos = Number(formRegistro.querySelector(".registro-minutos").value) || 0;
        const totalMin = horas * 60 + minutos;
        if (totalMin <= 0) return;
        await addDoc(
          collection(db, "redes", redeLogada.id, "celulas", celula.id, "membros", membro.id, "registros"),
          { dia, data: dataFromDia(dia), minutos: totalMin, criadoEm: serverTimestamp() }
        );
        await carregarAdmin();
      });

      const listaRegistros = noMembro.querySelector(".lista-registros");
      membro.registros
        .sort((a,b) => a.dia - b.dia)
        .forEach(reg => {
          const noReg = tplRegistro.content.cloneNode(true);
          noReg.querySelector(".registro-item-dia").textContent = `Dia ${reg.dia} — ${reg.data}`;
          noReg.querySelector(".registro-item-tempo").textContent = formatarMinutos(reg.minutos);
          noReg.querySelector(".registro-item-excluir").addEventListener("click", async () => {
            if (!confirm(`Excluir o lançamento do Dia ${reg.dia} de ${membro.nome}?`)) return;
            await deleteDoc(doc(db, "redes", redeLogada.id, "celulas", celula.id, "membros", membro.id, "registros", reg.id));
            await carregarAdmin();
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
  montarEscadaDias();
  await verificarSeed();
  await carregarPainel();
  await popularSelectRedesLogin();

  // Auto-atualiza o painel a cada 20s (útil para telão/projeção durante o culto)
  autoRefreshTimer = setInterval(carregarPainel, 20000);

  // Retoma sessão do discipulador, se ainda estiver marcada neste navegador
  const redeSalva = sessionStorage.getItem("redeLogadaId");
  if (redeSalva){
    const snap = await getDoc(doc(db, "redes", redeSalva));
    if (snap.exists()){
      redeLogada = { id: redeSalva, ...snap.data() };
      document.getElementById("login-box").classList.add("oculto");
      document.getElementById("admin-box").classList.remove("oculto");
      document.getElementById("admin-nome-rede").textContent = redeLogada.nome;
      document.getElementById("admin-categoria").textContent = redeLogada.categoria;
      await carregarAdmin();
    }
  }
}

iniciar();
