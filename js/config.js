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
  // --- Liderança ---
  {
    id: "presbiterio",
    nome: "Presbitério",
    categoria: "Liderança",
    pin: "9999",
    // "celulas" é opcional: quando existe, o sistema consegue criar as
    // células e os membros dessa rede já prontos (no primeiro uso, ou pelo
    // botão "Criar células e membros padrão" na Área do discipulador).
    celulas: [
      {
        nome: "Pastores e obreiros",
        membros: [
          "Pr. Rogério",
          "Pr.ª Irlena",
          "Pr. Edson Filho",
          "Pr.ª Marcela",
          "Pr. Edson Pai",
          "Pr.ª Nice",
          "Ob. Josemar",
          "Ob.ª (esposa do Josemar)"
        ]
      },
      {
        nome: "Discipuladores",
        membros: [
          "Andrew e Joyce",
          "Vinícius e Emily",
          "Eduardo e Marcella",
          "David e Malu",
          "Gabriel e Geovana",
          "Gabriel e Milena",
          "Henrique e Daiana",
          "Luiz e Magda",
          "Michel e Bruna",
          "Djaime e Vilma",
          "Jean e Patrícia",
          "Marco e Viviane",
          "Jeferson e Aline",
          "Isaqueu e Andréia",
          "Ivo e Dani"
        ]
      }
    ]
  },

  { id: "tena",    nome: "Teená",   categoria: "Adolescentes", pin: "1111" },
  { id: "ekballo", nome: "Ekballo", categoria: "Adolescentes", pin: "2222" },
  { id: "lakad",   nome: "Lakad",   categoria: "Adolescentes", pin: "3333" },
  { id: "sozo",    nome: "Sozo",    categoria: "Jovens",       pin: "4444", logo: "img/logo-sozo.png" },
  { id: "zoe",     nome: "Zoe",     categoria: "Jovens",       pin: "5555" },
  { id: "chosen",  nome: "Chosen",  categoria: "Jovens",       pin: "6666" },

  // --- Ágape (adultos) — cada casal lidera uma rede própria ---
  { id: "agape-jean",     nome: "Jean e Patrícia",   categoria: "Ágape", pin: "7001" },
  { id: "agape-marco",    nome: "Marco e Viviane",   categoria: "Ágape", pin: "7002" },
  { id: "agape-jeferson", nome: "Jeferson e Aline",  categoria: "Ágape", pin: "7003" },
  { id: "agape-isaqueu",  nome: "Isaqueu e Andréia", categoria: "Ágape", pin: "7004" },
  { id: "agape-ivo",      nome: "Ivo e Dani",        categoria: "Ágape", pin: "7005" },

  // --- Sal da Terra (adultos) — cada casal lidera uma rede própria ---
  { id: "sal-henrique", nome: "Henrique e Daiana", categoria: "Sal da Terra", pin: "8001" },
  { id: "sal-luiz",     nome: "Luiz e Magda",      categoria: "Sal da Terra", pin: "8002" },
  { id: "sal-michel",   nome: "Michel e Bruna",    categoria: "Sal da Terra", pin: "8003" },
  { id: "sal-djaime",   nome: "Djaime e Vilma",    categoria: "Sal da Terra", pin: "8004" }
];

// Nome de quem lidera cada categoria/supervisão. Aparece em letra menor ao
// lado do título da categoria no Painel. Categoria sem entrada aqui só
// mostra o nome dela mesmo.
export const CATEGORIA_LIDERES = {
  "Ágape": "Pr. Edson Pai",
  "Sal da Terra": "Ob. Josemar"
};

// PIN mestre: entra na Área do discipulador com acesso a todas as redes
// (troca entre elas sem precisar sair e logar de novo). Também pode ser
// trocado depois de logado, na própria tela. É criado junto com as redes no
// primeiro uso ("Configurar as redes iniciais").
export const ADMIN_PIN_PADRAO = "0000";
