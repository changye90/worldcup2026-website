import type { Lang } from './i18n';

export interface SeoGuideModule {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface TicketSeoGuidesContent {
  heading: string;
  intro: string;
  modules: SeoGuideModule[];
}

const guides: Record<Lang, TicketSeoGuidesContent> = {
  en: {
    heading: 'World Cup 2026 ticket guides',
    intro:
      'Practical fan-to-fan notes for buying and selling FIFA World Cup 2026 tickets on OKcopa — not financial advice; always verify listings and use official transfer rules when available.',
    modules: [
      {
        id: 'buy-strategy',
        title: 'Ticket buying strategy',
        paragraphs: [
          'Start with your must-see matches and host city travel plan, then hunt by match number and stadium — not just country. Group-stage weekday games in less hyped cities often trade below knockout fixtures in New York, Los Angeles, or Mexico City.',
          'Compare category (Cat 1–4 or VIP), row/block, and whether the seller can transfer through FIFA or meet in person. A slightly higher price with a verifiable transfer beats a “too good to be true” discount.',
        ],
        bullets: [
          'Book flights and lodging before locking tickets if the city is already sold out elsewhere.',
          'Prefer sellers who state quantity, seat block, and delivery method in the listing.',
          'Ask for kickoff time and match number so you are not buying the wrong session.',
          'Negotiate on OKcopa via WhatsApp — many listings are marked Negotiable.',
        ],
      },
      {
        id: 'price-trends',
        title: 'Price trends & what moves the market',
        paragraphs: [
          'Secondary prices usually rise as kickoff approaches and spike for later rounds (Round of 16, quarters, semis, final). Early group-stage listings can soften if sellers need cash before travel.',
          'Host-nation games, rivalry fixtures, and weekend kickoffs in premium metros tend to hold firmer asks. Category 1 near midfield and club-seat packages command the highest fan-to-fan premiums.',
          'On OKcopa you will see fixed USD asks and Negotiable posts — use both to sense the local floor before you commit.',
        ],
        bullets: [
          'Knockout rounds: expect wider spreads; buy early only if the seat is non-refundable and verified.',
          'Multi-match sellers: check if one listing covers several games — confirm each match ID.',
          'Last-minute drops happen 24–72h before kickoff when plans change — refresh the wall often.',
        ],
      },
      {
        id: 'fan-market',
        title: 'Fan-to-fan vs big resale platforms',
        paragraphs: [
          'OKcopa is a free notice board: you talk to the ticket owner on WhatsApp with no platform buyer fee. Major resale sites often add large service charges on top of the ask.',
          'That does not remove risk — you still must confirm authenticity, transfer eligibility, and payment safety. Treat every deal like a private sale with a stranger, not a checkout cart.',
        ],
        bullets: [
          'Use FIFA / authorized resale when your ticket type requires it.',
          'Avoid wire-only or crypto-only sellers you cannot verify.',
          'Keep screenshots of chat, listing URL, and payment receipts.',
        ],
      },
      {
        id: 'use-okcopa',
        title: 'How to use the OKcopa ticket wall',
        paragraphs: [
          'Filter by host city to see listings tied to that stadium market. Tap Contact via WhatsApp on a card to open a pre-filled message with match context.',
          'Selling? Post from the hero buttons — your listing can be shared with a link preview so friends see match, seats, and price before they message you.',
        ],
        bullets: [
          'Share listing links with ?ticket=ID so buyers land on your post.',
          'Switch language (EN / ES / PT) for hosts across USA, Mexico, and Canada.',
          'Pair tickets with stays and car hire tabs on the same site for trip planning.',
        ],
      },
      {
        id: 'safety',
        title: 'Safety checklist before you pay',
        paragraphs: [
          'OKcopa does not hold money or guarantee tickets. Use the checklist below every time — if a seller pressures instant payment without details, walk away.',
        ],
        bullets: [
          'Match number, teams, date, and stadium name match the official schedule.',
          'Seat category and block/row appear in both the structured card and seller notes.',
          'Transfer method is legal for your ticket type (FIFA app, PDF rules, in-person handoff).',
          'Payment is traceable; never pay gift cards or unknown links for “fees”.',
        ],
      },
    ],
  },
  es: {
    heading: 'Guías de boletos Mundial 2026',
    intro:
      'Notas prácticas fan a fan para comprar y vender boletos del Mundial 2026 en OKcopa — no es asesoría financiera; verifica cada anuncio y usa transferencias oficiales cuando aplique.',
    modules: [
      {
        id: 'buy-strategy',
        title: 'Estrategia para comprar boletos',
        paragraphs: [
          'Empieza por los partidos imprescindibles y tu ciudad sede, luego busca por número de partido y estadio. Los juegos de fase de grupos entre semana en ciudades con menos demanda suelen cotizar por debajo de octavos o finales en Nueva York, Los Ángeles o Ciudad de México.',
          'Compara categoría (Cat 1–4 o VIP), bloque/fila y si el vendedor transfiere por FIFA o entrega en persona. Un precio un poco mayor con transferencia verificable vale más que un descuento sospechoso.',
        ],
        bullets: [
          'Confirma vuelos y hotel antes de cerrar boletos si la ciudad ya está saturada.',
          'Prefiere anuncios con cantidad, bloque y método de entrega claros.',
          'Pide horario y número de partido para no comprar la sesión equivocada.',
          'Muchos anuncios dicen A convenir — negocia por WhatsApp.',
        ],
      },
      {
        id: 'price-trends',
        title: 'Tendencias de precio',
        paragraphs: [
          'Los precios secundarios suelen subir al acercarse el kickoff y dispararse en rondas eliminatorias. Las publicaciones tempranas de fase de grupos pueden bajar si el vendedor necesita liquidez antes del viaje.',
          'Partidos del anfitrión, clásicos y fines de semana en ciudades premium mantienen precios más firmes. Cat 1 cerca del medio campo encabeza los premios fan a fan.',
          'En OKcopa verás precios fijos en USD y anuncios a convenir — úsalos para sentir el piso del mercado local.',
        ],
        bullets: [
          'Eliminatorias: spreads más amplios; compra temprano solo con asiento verificado.',
          'Vendedores multi-partido: confirma cada ID de partido.',
          'Caídas de última hora 24–72 h antes del partido — revisa el muro seguido.',
        ],
      },
      {
        id: 'fan-market',
        title: 'Fan a fan vs plataformas grandes',
        paragraphs: [
          'OKcopa es un tablón gratis: hablas con el dueño por WhatsApp sin comisión de comprador. Los grandes revendedores suelen sumar cargos altos sobre el precio pedido.',
          'El riesgo sigue — confirma autenticidad y reglas de transferencia. Trata cada trato como venta privada, no como carrito de e-commerce.',
        ],
        bullets: [
          'Usa FIFA / reventa autorizada cuando tu boleto lo exija.',
          'Evita solo transferencia bancaria o cripto sin verificar identidad.',
          'Guarda capturas de chat, URL del anuncio y comprobantes.',
        ],
      },
      {
        id: 'use-okcopa',
        title: 'Cómo usar el muro OKcopa',
        paragraphs: [
          'Filtra por ciudad sede para ver anuncios de ese mercado. Toca Contactar por WhatsApp para abrir un mensaje con contexto del partido.',
          '¿Vendes? Publica desde el hero — comparte el enlace con vista previa para que vean partido, asientos y precio antes de escribirte.',
        ],
        bullets: [
          'Comparte enlaces ?ticket=ID para que caigan en tu publicación.',
          'Cambia idioma (EN / ES / PT) para fans en USA, México y Canadá.',
          'Combina boletos con pestañas de hospedaje y autos en el mismo sitio.',
        ],
      },
      {
        id: 'safety',
        title: 'Lista de seguridad antes de pagar',
        paragraphs: [
          'OKcopa no guarda dinero ni garantiza boletos. Usa esta lista cada vez — si presionan pago instantáneo sin datos, aléjate.',
        ],
        bullets: [
          'Número de partido, equipos, fecha y estadio coinciden con el calendario oficial.',
          'Categoría y bloque/fila aparecen en la tarjeta y en notas del vendedor.',
          'Método de transferencia legal para tu tipo de boleto.',
          'Pago rastreable; nunca tarjetas de regalo o enlaces de “comisión”.',
        ],
      },
    ],
  },
  pt: {
    heading: 'Guias de ingressos Copa 2026',
    intro:
      'Notas práticas torcedor a torcedor para comprar e vender ingressos da Copa 2026 na OKcopa — não é consultoria financeira; verifique cada anúncio e use transferência oficial quando couber.',
    modules: [
      {
        id: 'buy-strategy',
        title: 'Estratégia para comprar ingressos',
        paragraphs: [
          'Comece pelos jogos obrigatórios e pela cidade-sede, depois busque por número do jogo e estádio. Jogos da fase de grupos em dias de semana em cidades menos disputadas costumam ficar abaixo de mata-mata ou final em Nova York, Los Angeles ou Cidade do México.',
          'Compare categoria (Cat 1–4 ou VIP), bloco/fileira e se o vendedor transfere pela FIFA ou entrega pessoalmente. Preço um pouco maior com transferência verificável vale mais que desconto suspeito.',
        ],
        bullets: [
          'Confirme voos e hotel antes de fechar ingressos se a cidade estiver cheia.',
          'Prefira anúncios com quantidade, bloco e entrega claros.',
          'Peça horário e número do jogo para não comprar a sessão errada.',
          'Muitos anúncios estão A combinar — negocie no WhatsApp.',
        ],
      },
      {
        id: 'price-trends',
        title: 'Tendências de preço',
        paragraphs: [
          'Preços secundários costumam subir perto do kickoff e disparar nas fases eliminatórias. Anúncios cedo na fase de grupos podem cair se o vendedor precisar de caixa antes da viagem.',
          'Jogos do país-sede, clássicos e fins de semana em metrópoles premium seguram preços mais firmes. Cat 1 perto do meio de campo lidera os prêmios fan a fan.',
          'Na OKcopa você verá preços fixos em USD e A combinar — use os dois para sentir o piso do mercado.',
        ],
        bullets: [
          'Mata-mata: spreads maiores; compre cedo só com assento verificado.',
          'Vendedores com vários jogos: confirme cada ID de partida.',
          'Quedas de última hora 24–72 h antes do jogo — atualize o mural.',
        ],
      },
      {
        id: 'fan-market',
        title: 'Torcedor a torcedor vs grandes revendas',
        paragraphs: [
          'OKcopa é um mural grátis: você fala com o dono no WhatsApp sem taxa de comprador. Grandes sites de revenda costumam somar taxas altas ao pedido.',
          'O risco continua — confirme autenticidade e regras de transferência. Trate cada negócio como venda privada.',
        ],
        bullets: [
          'Use FIFA / revenda autorizada quando seu ingresso exigir.',
          'Evite só PIX/transferência ou cripto sem verificar identidade.',
          'Guarde prints do chat, URL do anúncio e comprovantes.',
        ],
      },
      {
        id: 'use-okcopa',
        title: 'Como usar o mural OKcopa',
        paragraphs: [
          'Filtre por cidade-sede para ver anúncios daquele mercado. Toque em Contato via WhatsApp para abrir mensagem com contexto do jogo.',
          'Vendendo? Publique pelo hero — compartilhe o link com prévia de partida, assentos e preço.',
        ],
        bullets: [
          'Compartilhe links ?ticket=ID para abrir sua publicação.',
          'Troque idioma (EN / ES / PT) para fans nos EUA, México e Canadá.',
          'Combine ingressos com hospedagem e carros no mesmo site.',
        ],
      },
      {
        id: 'safety',
        title: 'Checklist de segurança antes de pagar',
        paragraphs: [
          'OKcopa não guarda dinheiro nem garante ingressos. Use a lista sempre — se pressionarem pagamento instantâneo, desista.',
        ],
        bullets: [
          'Número do jogo, times, data e estádio batem com o calendário oficial.',
          'Categoria e bloco/fileira aparecem no card e nas notas.',
          'Transferência legal para o tipo do seu ingresso.',
          'Pagamento rastreável; nunca gift cards ou links de “taxa”.',
        ],
      },
    ],
  },
};

export function getTicketSeoGuides(lang: Lang): TicketSeoGuidesContent {
  return guides[lang];
}
