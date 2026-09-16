// ===================== CONFIGURAÇÃO =====================
// 1) Troque os valores abaixo pelos dados do SEU projeto Firebase
//    (Console Firebase > Configurações do projeto > Seus apps > SDK setup).
// 2) No Firestore, crie o banco em modo "produção" e publique o conteúdo
//    do arquivo firestore.rules que está na raiz deste pacote.

export const firebaseConfig = {
  apiKey: "AIzaSyAELFTOVl-biGBhGCxIGZ6T6mqkVwR5JdQ",
  authDomain: "vide-47402.firebaseapp.com",
  projectId: "vide-47402",
  storageBucket: "vide-47402.firebasestorage.app",
  messagingSenderId: "741435220435",
  appId: "1:741435220435:web:09bd3f69148d5f0d120f26"
};

// Data do Dia 1 do jejum (formato AAAA-MM-DD). Ajuste se necessário.
export const JEJUM_INICIO = "2026-09-14";

// Quantidade total de dias do jejum
export const JEJUM_DIAS = 21;

// Tema do jejum, exibido no cabeçalho
export const JEJUM_TEMA = "A Escada da Multiplicação";

// Logo da igreja, exibido no cabeçalho do sistema (Painel e Área do discipulador)
export const IGREJA_NOME = "Videira — Igreja em Células";
export const IGREJA_LOGO = "img/logo-videira.png";

// Redes fixas da igreja. "id" é usado como identificador interno — não mude
// depois de já ter dados salvos. PIN inicial de cada rede (o discipulador
// pode trocar depois de entrar). "logo" é opcional: caminho de uma imagem
// para aparecer ao lado do nome da rede no Painel e na Área do discipulador.
export const REDES_PADRAO = [
  { id: "tena",       nome: "Teená",      categoria: "Adolescentes", pin: "1111" },
  { id: "ekballo",    nome: "Ekballo",    categoria: "Adolescentes", pin: "2222" },
  { id: "lakad",      nome: "Lakad",      categoria: "Adolescentes", pin: "3333" },
  { id: "sozo",       nome: "Sozo",       categoria: "Jovens",       pin: "4444", logo: "img/logo-sozo.png" },
  { id: "zoe",        nome: "Zoe",        categoria: "Jovens",       pin: "5555" },
  { id: "chosen",     nome: "Chosen",     categoria: "Jovens",       pin: "6666" },
  { id: "agape",      nome: "Rede Ágape (Pr. Edson Pai)",     categoria: "Adultos", pin: "7777" },
  { id: "saldaterra", nome: "Rede Sal da Terra (Ob. Josemar)", categoria: "Adultos", pin: "8888" }
];

// PIN mestre: entra na Área do discipulador com acesso às 6 redes (troca
// entre elas sem precisar sair e logar de novo). Também pode ser trocado
// depois de logado, na própria tela. É criado junto com as 6 redes no
// primeiro uso ("Configurar as 6 redes iniciais").
export const ADMIN_PIN_PADRAO = "0000";
