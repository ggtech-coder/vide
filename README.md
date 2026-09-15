# Relógio de Oração — Jejum 21 Dias

Sistema simples para substituir a lista manual no WhatsApp/papel. Sem
cadastro de usuário burocrático: cada uma das 6 redes tem um PIN próprio,
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
Painel: **"Configurar as 6 redes iniciais"**. Clique uma vez só — isso cria
Teená, Ekballo, Lakad, Sozo, Zoe e Chosen (cada uma com um PIN padrão, veja
`js/config.js` → `REDES_PADRAO`) e também o **PIN administrador** padrão
(`js/config.js` → `ADMIN_PIN_PADRAO`). Avise cada discipulador do PIN dele
e oriente a trocar na aba "Área do discipulador > Trocar o PIN desta rede".
Troque também o PIN administrador assim que possível (ver abaixo).

## Uso no dia a dia

- **Painel**: tela pública, pode ficar projetada no telão. Mostra o
  cronograma por dia (com os "degraus" 1 a 21) ou o total acumulado do
  jejum inteiro (marcando a caixinha), além de um comparativo Jovens vs.
  Adolescentes. Atualiza sozinho a cada 20s, e tem um botão "atualizar
  agora".
- **Área do discipulador**: o próprio discipulador entra com o PIN da
  rede dele e:
  - cria as células da rede (uma vez só, no início);
  - adiciona os membros de cada célula;
  - escolhe o **dia de lançamento** uma vez (setas ◄ ► ou "ir para hoje")
    e lança quanto cada membro orou naquele dia — o seletor de dia fica
    fixo até você mesmo trocar, então dá para lançar vários membros
    seguidos sem ele "voltar" sozinho para hoje;
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
- Categorias fixas hoje são "Jovens" e "Adolescentes" — se mudar os nomes
  das redes no futuro, é só editar os documentos em `redes/{id}` direto
  no Firestore (não precisa mexer no código).
