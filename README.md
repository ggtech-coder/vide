# Relógio de Oração — Jejum 21 Dias

Sistema simples para substituir a lista manual no WhatsApp/papel. Sem
cadastro de usuário burocrático: cada uma das 8 redes tem um PIN próprio,
o discipulador entra com esse PIN e só mexe na sua rede. Existe também um
**PIN administrador**, que dá acesso a todas as redes de uma vez.

## Como publicar

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com).
2. Ative o **Firestore Database** (modo produção).
3. Em *Configurações do projeto > Seus apps*, crie um app Web e copie as
   chaves para `js/config.js` (substitua os valores `SUA_API_KEY` etc.).
4. Em *Firestore > Regras*, cole o conteúdo de `firestore.rules` e publique.
5. Suba esta pasta para o GitHub Pages (ou qualquer hospedagem estática) e
   pronto — não tem backend para configurar.

## Primeiro uso

Abra o site publicado. Como o banco está vazio, vai aparecer um aviso no
Painel: **"Configurar as 8 redes iniciais"**. Clique uma vez só — isso cria
Teená, Ekballo, Lakad, Sozo, Zoe, Chosen, Ágape e Sal da Terra (cada uma com
um PIN padrão, veja `js/config.js` → `REDES_PADRAO`) e também o **PIN
administrador** padrão (`js/config.js` → `ADMIN_PIN_PADRAO`). Avise cada
discipulador do PIN dele e oriente a trocar na aba "Área do discipulador >
Trocar o PIN desta rede". Troque também o PIN administrador assim que
possível (ver abaixo).

> Atenção: o botão "Configurar as redes iniciais" só aparece quando o banco
> ainda está **vazio** (nenhuma rede cadastrada). Se você já tinha rodado o
> seed antes de adicionar Ágape e Sal da Terra, esse botão não vai aparecer
> de novo. Nesse caso, entre como administrador e use "Redefinir PIN de uma
> rede" — se a rede ainda não existir lá, peça para alguém criar os dois
> documentos que faltam direto no Firestore Console, em `redes/agape` e
> `redes/saldaterra`, com os campos `nome`, `categoria: "Adultos"` e `pin`
> (os mesmos valores que estão em `REDES_PADRAO`).

## Uso no dia a dia

- **Painel**: tela pública. No topo, o total de oração em número grande;
  abaixo, um gráfico com os 21 dias — cada barra é o total daquele dia, e
  clicar numa barra troca o dia mostrado. As setas ‹ › e as setas do
  teclado também navegam entre os dias (funciona com controle remoto de
  apresentação). O botão "Só esse dia / Jejum inteiro" alterna entre ver
  um dia ou o acumulado. Os nomes dos membros ficam escondidos atrás de
  "Ver quem orou" para a tela não virar um paredão. Atualiza sozinho a
  cada 20s.
- **Tema claro / escuro**: botão 🌗 no canto do cabeçalho. Ele alterna
  entre **automático → claro → escuro** e a escolha fica salva no
  navegador. No modo automático o site escurece sozinho das 18h às 6h e
  aparecem a lua e um céu estrelado ao fundo (com um meteoro de vez em
  quando). O tema escuro vale também para o modo telão.
- **Modo telão (dashboard)**: botão no canto do cabeçalho (ou a tecla
  **T**). Entra em tela cheia e troca a tela inteira por um painel de
  projeção, com:
  - o total de oração em número gigante, com Jovens x Adolescentes ao lado;
  - **ranking das redes**, com barra proporcional e tempo de cada uma;
  - **ranking das células** (as que mais oraram primeiro). Quando há mais
    células do que cabe na tela, ele passa as páginas sozinho a cada 12s;
  - a linha dos 21 dias no rodapé, destacando o dia de hoje;
  - dia do jejum, data e relógio no topo.
  Os dados se atualizam sozinhos a cada 20s. As setas ‹ › do teclado
  trocam o dia mesmo dentro do telão. Sai com Esc ou T de novo.
- **Células que abrem e fecham**: no Painel, cada rede lista suas células
  com o nome em destaque, a quantidade de membros e o tempo total. Clicar
  na célula abre a lista de quem orou. Os botões "Expandir tudo" e
  "Recolher tudo" ficam logo acima da lista, e o sistema lembra o que
  você deixou aberto mesmo quando a tela se atualiza sozinha.
- **Área do discipulador**: o próprio discipulador entra com o PIN da
  rede dele e:
  - navega entre as células pelos atalhos no topo da lista ("Ir para a
    célula") — clicar num deles abre a célula e leva a tela até ela;
  - cada célula abre e fecha no clique, então dá pra manter só a que você
    está lançando aberta;
  - cria as células da rede (uma vez só, no início);
  - adiciona os membros de cada célula;
  - escolhe o **dia de lançamento** uma vez (setas ◄ ► ou "ir para hoje")
    e lança quanto cada membro orou naquele dia — o seletor de dia fica
    fixo até você mesmo trocar, então dá para lançar vários membros
    seguidos sem ele "voltar" sozinho para hoje;
  - pode usar o **Cronômetro** de cada membro: clica em "Cronômetro" no
    começo da oração e em "Parar e preencher" no fim — o tempo já entra
    nos campos de horas/minutos, é só conferir e clicar em Lançar;
  - pode excluir um lançamento errado.
- **Acesso administrador**: na tela de login, escolha a opção
  "🔑 Acesso administrador (todas as redes)" e digite o PIN administrador.
  Isso abre um seletor para trocar entre as 6 redes sem precisar sair e
  logar de novo, além de uma seção para redefinir o PIN de qualquer rede
  (útil quando um discipulador esquece o PIN) e trocar o próprio PIN
  administrador.

## Logos

- `js/config.js` → `IGREJA_LOGO`: logo da igreja, aparece no cabeçalho do
  sistema (arquivo em `img/logo-videira.png`).
- Em `REDES_PADRAO`, cada rede pode ter um campo opcional `logo` (caminho
  de imagem) — hoje só a Sozo tem (`img/logo-sozo.png`), aparece ao lado
  do nome dela no Painel e na Área do discipulador. Para dar logo a outra
  rede, salve a imagem em `img/` e adicione `logo: "img/arquivo.png"` na
  entrada dela.

## Sobre segurança

Não usa login de verdade (Firebase Auth) de propósito, para não virar
burocrático — o PIN (inclusive o administrador) é uma trava só dentro do
app. Para uma igreja isso costuma bastar. Se um dia quiser mais segurança,
dá pra evoluir para Firebase Auth com uma conta por discipulador.

## Ajustar depois

- `js/config.js`: data de início do jejum, tema, logo da igreja, PIN
  administrador padrão, e a lista de redes/PINs/logos iniciais.
- Categorias hoje são "Jovens", "Adolescentes" e "Adultos" (Ágape e Sal da
  Terra) — se mudar os nomes das redes no futuro, é só editar os documentos
  em `redes/{id}` direto no Firestore (não precisa mexer no código).

## Redes de adultos (Ágape e Sal da Terra) e suas células

As duas redes novas já estão em `js/config.js` → `REDES_PADRAO`:

| Rede | Líder | PIN padrão |
|---|---|---|
| Rede Ágape | Pr. Edson Pai | `7777` |
| Rede Sal da Terra | Ob. Josemar | `8888` |

**As células (casais) não ficam no código** — elas são cadastradas pelo
próprio discipulador dentro do app, na aba "Área do discipulador", depois
de entrar com o PIN da rede (ou pelo acesso administrador). Isso porque
células e membros moram no Firestore, não no arquivo de configuração.
Passo a passo: entre com o PIN da rede → "Criar célula" → digite o nome →
repita para cada casal abaixo. Sugestão de nomes para cadastrar:

**Rede Ágape (Pr. Edson Pai):**
- Jean e Patrícia
- Marco e Viviane
- Jeferson e Aline
- Isaqueu e Andréia
- Ivo e Dani

**Rede Sal da Terra (Ob. Josemar):**
- Henrique e Daiana
- Luiz e Magda
- Michel e Bruna
- Djaime e Vilma
