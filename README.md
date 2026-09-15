# Relógio de Oração — Jejum 21 Dias

Sistema simples para substituir a lista manual no WhatsApp/papel. Sem
cadastro de usuário burocrático: cada uma das 6 redes tem um PIN próprio,
o discipulador entra com esse PIN e só mexe na sua rede.

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
Teená, Ekballo, Lakad, Sozo, Zoe e Chosen, cada uma com um PIN padrão
(veja `js/config.js`, array `REDES_PADRAO`). Avise cada discipulador do PIN
dele e oriente a trocar na aba "Área do discipulador > Trocar o PIN desta
rede".

## Uso no dia a dia

- **Painel**: tela pública, pode ficar projetada no telão. Mostra o
  cronograma por dia (com os "degraus" 1 a 21) ou o total acumulado do
  jejum inteiro (marcando a caixinha). Atualiza sozinho a cada 20s, e tem
  um botão "atualizar agora".
- **Área do discipulador**: o próprio discipulador entra com o PIN da
  rede dele e:
  - cria as células da rede (uma vez só, no início);
  - adiciona os membros de cada célula;
  - lança quanto cada membro orou em cada dia (horas + minutos) — o
    sistema soma tudo sozinho, sem risco de erro de conta;
  - pode excluir um lançamento errado.

## Sobre segurança

Não usa login de verdade (Firebase Auth) de propósito, para não virar
burocrático — o PIN é uma trava só dentro do app. Para uma igreja isso
costuma bastar. Se um dia quiser mais segurança, dá pra evoluir para
Firebase Auth com uma conta por discipulador.

## Ajustar depois

- `js/config.js`: data de início do jejum, tema, e a lista de redes/PINs
  iniciais.
- Categorias fixas hoje são "Jovens" e "Adolescentes" — se mudar os nomes
  das redes no futuro, é só editar os documentos em `redes/{id}` direto
  no Firestore (não precisa mexer no código).
