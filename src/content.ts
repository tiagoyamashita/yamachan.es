export const restaurant = {
  name: 'Yama-Chan',
  nameJa: '山ちゃん',
  instagramUrl: 'https://www.instagram.com/yamachan.es/',
  instagramHandle: '@yamachan.es',
  phone: '+34604949252',
  phoneDisplay: '+34 604 94 92 52',
  whatsapp:
    'https://wa.me/34604949252?text=' +
    encodeURIComponent(
      'Hola, me gustaría reservar mesa en Yama-Chan.',
    ),
  mapsUrl:
    'https://www.google.com/maps/place/Yama-Chan/@38.3418399,-0.4968258,17z/data=!4m6!3m5!1s0xd6237f702073887:0x8d2f887ef88b335!8m2!3d38.3418399!4d-0.4968258!16s%2Fg%2F11svlwdj4w',
  googleReviewsUrl:
    'https://www.google.com/maps/place/Yama-Chan/@38.3418399,-0.4968258,17z/data=!4m8!3m7!1s0xd6237f702073887:0x8d2f887ef88b335!8m2!3d38.3418399!4d-0.4968258!9m1!1b1!16s%2Fg%2F11svlwdj4w',
  mapsEmbed:
    'https://maps.google.com/maps?cid=635843760135648053&z=16&hl=es&output=embed',
  googleRating: 4.9,
  googleReviewCount: 118,
  googleMaxStars: 5,
} as const

export type Locale = 'es' | 'en'

export type DishId =
  | 'katsudon'
  | 'sushi'
  | 'gyoza'
  | 'takoyaki'
  | 'okonomiyaki'
  | 'yakisoba'

export const dishOrder: DishId[] = [
  'katsudon',
  'sushi',
  'gyoza',
  'takoyaki',
  'okonomiyaki',
  'yakisoba',
]

type Copy = {
  metaTitle: string
  metaDescription: string
  nav: {
    carta: string
    historia: string
    fotos: string
    opiniones: string
    visitas: string
    reservar: string
  }
  heroKicker: string
  heroTitle: string
  heroLead: string
  heroReserve: string
  heroCarta: string
  heroRating: string
  aboutEyebrow: string
  aboutTitle: string
  aboutBody: string[]
  aboutNote: string
  cartaEyebrow: string
  cartaTitle: string
  cartaLead: string
  dishes: Record<
    DishId,
    {
      name: string
      nameJa: string
      blurb: string
    }
  >
  moreDishesTitle: string
  moreDishes: string[]
  vegNote: string
  reviewsEyebrow: string
  reviewsTitle: string
  reviewsRating: string
  reviewsCta: string
  reviewsOutOf: string
  reviewsCountSuffix: string
  reviewsOpenLabel: string
  reviews: { quote: string; author: string; stars: 1 | 2 | 3 | 4 | 5 }[]
  visitEyebrow: string
  visitTitle: string
  visitLead: string
  hoursTitle: string
  hoursNote: string
  hours: { days: string; time: string }[]
  addressTitle: string
  addressLines: string[]
  neighborhood: string
  call: string
  whatsapp: string
  instagram: string
  directions: string
  instagramCtaTitle: string
  instagramCtaBody: string
  instagramCtaButton: string
  footerTag: string
  langLabel: string
  openMenu: string
  closeMenu: string
}

export const copy: Record<Locale, Copy> = {
  es: {
    metaTitle: 'Yama-Chan — Cocina japonesa auténtica en Alicante',
    metaDescription:
      'Restaurante japonés familiar en Benalúa, Alicante. Katsudon, sushi, gyoza y platos caseros del chef Yamashita. Reserva en un local de cinco mesas.',
    nav: {
      carta: 'Carta',
      historia: 'La casa',
      fotos: 'Fotos',
      opiniones: 'Opiniones',
      visitas: 'Visítanos',
      reservar: 'Reservar',
    },
    heroKicker: 'Benalúa · Alicante',
    heroTitle: 'Cocina japonesa de verdad, en un local de cinco mesas.',
    heroLead:
      'Yama-Chan es el restaurante de sus dueños: el chef Yamashita en cocina y un trato de casa. Sin fusionar, sin atajos. Recetas que saben a Japón.',
    heroReserve: 'Reservar mesa',
    heroCarta: 'Ver la carta',
    heroRating: '4,9 en Google · 118 opiniones · conviene reservar',
    aboutEyebrow: 'La casa',
    aboutTitle: 'Un japonés de barrio, no una imitación.',
    aboutBody: [
      'En C/ Pardo Gimeno, local izquierda, el chef Yamashita cocina platos tradicionales con el mismo criterio que en casa: ingredientes honestos, raciones generosas y el tiempo que cada receta pide.',
      'El comedor es pequeño y tranquilo —unas cinco mesas— y lo atienden sus propios dueños. Por eso el servicio es cercano, y por eso hace falta reservar, sobre todo el fin de semana.',
    ],
    aboutNote: 'Música japonesa, ambiente sencillo y comida casera. いらっしゃいませ',
    cartaEyebrow: 'La carta',
    cartaTitle: 'Lo que la gente vuelve a pedir.',
    cartaLead:
      'Platos calientes y sushi fresco, tal como aparecen en nuestro Instagram. La carta cambia con el mercado; estos son los que más se repiten.',
    dishes: {
      katsudon: {
        name: 'Katsudon / Katsu curry',
        nameJa: 'カツ丼',
        blurb:
          'El plato que más recomiendan. Cerdo empanado sobre arroz, o con curry japonés de verdad.',
      },
      sushi: {
        name: 'Sushi fresco',
        nameJa: '寿司',
        blurb:
          'Pescado de calidad, arroz en su punto. Nigiri y rolls, sin el teatro de un sushi-bar.',
      },
      gyoza: {
        name: 'Gyoza',
        nameJa: '餃子',
        blurb: 'A la plancha, crujientes por debajo. De cerdo o de verduras.',
      },
      takoyaki: {
        name: 'Takoyaki',
        nameJa: 'たこ焼き',
        blurb: 'Bolas de pulpo con salsa, mayonesa y katsuobushi. El aperitivo que se acaba primero.',
      },
      okonomiyaki: {
        name: 'Okonomiyaki',
        nameJa: 'お好み焼き',
        blurb: 'Tortilla japonesa salada, con salsa, aonori y bonito. Poco habitual en Alicante.',
      },
      yakisoba: {
        name: 'Yakisoba',
        nameJa: '焼きそば',
        blurb: 'Fideos salteados al estilo de casa. También hay udon con tempura.',
      },
    },
    moreDishesTitle: 'También en mesa',
    moreDishes: [
      'Yakiniku don',
      'Karaage curry',
      'Tempura udon',
      'Edamame',
      'Tofu frito con arroz',
    ],
    vegNote:
      'Hay opciones vegetarianas: setas, gyoza de verduras y tofu frito relleno de arroz.',
    reviewsEyebrow: 'Opiniones',
    reviewsTitle: '“Como volver a estar en Japón.”',
    reviewsRating: '4,9 de 5 estrellas · 118 opiniones en Google',
    reviewsCta: 'Leer en Google',
    reviewsOutOf: 'de 5',
    reviewsCountSuffix: 'opiniones en Google',
    reviewsOpenLabel: 'Abrir en Google Maps',
    reviews: [
      {
        quote:
          'Hemos ido a comer y sinceramente solo me he acordado de hacerle foto a los takoyakis. Ha sido empezar a comer y nos hemos olvidado por completo de las fotos de lo bueno que estaba todo. Hemos pedido gyozas, okonomiyaki, katsudon y yakisoba. Todo espectacular. Repetiremos.',
        author: 'Esperanza',
        stars: 5,
      },
      {
        quote:
          'Fresquito, acogedor, agradable. Buen servicio, vicio de comida, cada plato desprende un olor y unos colores que resultan difíciles encontrar en estos tiempos.',
        author: 'Ygnomir',
        stars: 5,
      },
      {
        quote:
          'Todo muy bueno, sabores muy de Japón, ha sido como volver a estar allí. Un poco de espera para pedir, pero luego todo muy fluido. Hay que reservar con tiempo. Recomendado y volveremos.',
        author: 'Ana',
        stars: 5,
      },
      {
        quote:
          'Nuestro restaurante japonés favorito de Alicante. Lejos de las adaptaciones asiáticas de la comida japonesa que ofrecen otros restaurantes, en Yama-Chan puedes disfrutar de una cocina auténticamente japonesa. Los propietarios son encantadores.',
        author: 'Luca',
        stars: 5,
      },
    ],
    visitEyebrow: 'Visítanos',
    visitTitle: 'Reserva antes de venir.',
    visitLead:
      'Somos un local pequeño. Llama, escribe por WhatsApp o mira el horario del día en Instagram.',
    hoursTitle: 'Horario',
    hoursNote:
      'El horario puede cambiar. Confírmalo en Instagram o al reservar.',
    hours: [
      { days: 'Miércoles – sábado', time: '13:00 – 16:30' },
      { days: 'Viernes noche', time: '20:00 – 22:30' },
      { days: 'Domingo – martes', time: 'Cerrado' },
    ],
    addressTitle: 'Dónde estamos',
    addressLines: [
      'C/ Pardo Gimeno, 10',
      'Local izquierda',
      '03007 Alicante',
    ],
    neighborhood: 'Barrio de Benalúa, junto a Plaza de Navarro Rodrigo.',
    call: 'Llamar',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    directions: 'Cómo llegar',
    instagramCtaTitle: 'Las fotos de la casa, en Instagram.',
    instagramCtaBody:
      'Platos del día, la carta y el local tal como los publicamos en @yamachan.es.',
    instagramCtaButton: 'Seguir @yamachan.es',
    footerTag: 'Cocina japonesa en Alicante',
    langLabel: 'EN',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
  },
  en: {
    metaTitle: 'Yama-Chan — Authentic Japanese cooking in Alicante',
    metaDescription:
      'Family-run Japanese restaurant in Benalúa, Alicante. Katsudon, sushi, gyoza and home-style dishes from chef Yamashita. Five tables — please book ahead.',
    nav: {
      carta: 'Menu',
      historia: 'The house',
      fotos: 'Photos',
      opiniones: 'Reviews',
      visitas: 'Visit',
      reservar: 'Book',
    },
    heroKicker: 'Benalúa · Alicante',
    heroTitle: 'Real Japanese cooking, in a five-table room.',
    heroLead:
      'Yama-Chan is run by its owners: chef Yamashita in the kitchen and a welcome that feels like home. No fusion, no shortcuts. Recipes that taste like Japan.',
    heroReserve: 'Book a table',
    heroCarta: 'See the menu',
    heroRating: '4.9 on Google · 118 reviews · reservations recommended',
    aboutEyebrow: 'The house',
    aboutTitle: 'A neighborhood Japanese kitchen — not an imitation.',
    aboutBody: [
      'On C/ Pardo Gimeno, left-hand unit, chef Yamashita cooks traditional plates the way they are made at home: honest ingredients, generous portions, and the time each recipe needs.',
      'The dining room is small and quiet — about five tables — and the owners serve you themselves. That is why the welcome is personal, and why you should book, especially on weekends.',
    ],
    aboutNote: 'Japanese music, a simple room, home cooking. いらっしゃいませ',
    cartaEyebrow: 'The menu',
    cartaTitle: 'What people come back for.',
    cartaLead:
      'Hot dishes and fresh sushi, the same plates we share on Instagram. The menu follows the market; these are the ones guests order again.',
    dishes: {
      katsudon: {
        name: 'Katsudon / Katsu curry',
        nameJa: 'カツ丼',
        blurb:
          'The dish most people recommend. Breaded pork over rice, or with proper Japanese curry.',
      },
      sushi: {
        name: 'Fresh sushi',
        nameJa: '寿司',
        blurb:
          'Good fish, rice done right. Nigiri and rolls — without sushi-bar theatre.',
      },
      gyoza: {
        name: 'Gyoza',
        nameJa: '餃子',
        blurb: 'Pan-fried, crisp on the bottom. Pork or vegetable.',
      },
      takoyaki: {
        name: 'Takoyaki',
        nameJa: 'たこ焼き',
        blurb: 'Octopus balls with sauce, mayo and katsuobushi. They go first.',
      },
      okonomiyaki: {
        name: 'Okonomiyaki',
        nameJa: 'お好み焼き',
        blurb: 'Savoury Japanese pancake with sauce, aonori and bonito. Rare in Alicante.',
      },
      yakisoba: {
        name: 'Yakisoba',
        nameJa: '焼きそば',
        blurb: 'House-style fried noodles. Tempura udon as well.',
      },
    },
    moreDishesTitle: 'Also on the table',
    moreDishes: [
      'Yakiniku don',
      'Karaage curry',
      'Tempura udon',
      'Edamame',
      'Fried tofu with rice',
    ],
    vegNote:
      'Vegetarian plates include mushrooms, vegetable gyoza, and fried tofu stuffed with rice.',
    reviewsEyebrow: 'Guests',
    reviewsTitle: '“Like being back in Japan.”',
    reviewsRating: '4.9 out of 5 stars · 118 Google reviews',
    reviewsCta: 'Read on Google',
    reviewsOutOf: 'out of 5',
    reviewsCountSuffix: 'Google reviews',
    reviewsOpenLabel: 'Open in Google Maps',
    reviews: [
      {
        quote:
          'We went for lunch and I only remembered to photograph the takoyaki. Once we started eating we forgot the photos entirely because everything was so good. We ordered gyoza, okonomiyaki, katsudon and yakisoba. Spectacular. We’ll be back.',
        author: 'Esperanza',
        stars: 5,
      },
      {
        quote:
          'Cool, welcoming, pleasant. Good service, food you could get hooked on — each plate has a smell and colour that’s hard to find these days.',
        author: 'Ygnomir',
        stars: 5,
      },
      {
        quote:
          'All very good, flavours that are very much Japan — it felt like going back. A little wait to order, then everything flowed. Book ahead. Recommended, and we’ll return.',
        author: 'Ana',
        stars: 5,
      },
      {
        quote:
          'Our favourite Japanese restaurant in Alicante. Far from the Asian adaptations elsewhere: at Yama-Chan the cooking is genuinely Japanese. The owners are lovely.',
        author: 'Luca',
        stars: 5,
      },
    ],
    visitEyebrow: 'Visit',
    visitTitle: 'Please book before you come.',
    visitLead:
      'We are a small room. Call, write on WhatsApp, or check today’s hours on Instagram.',
    hoursTitle: 'Hours',
    hoursNote: 'Hours can change. Confirm on Instagram or when you book.',
    hours: [
      { days: 'Wednesday – Saturday', time: '13:00 – 16:30' },
      { days: 'Friday evening', time: '20:00 – 22:30' },
      { days: 'Sunday – Tuesday', time: 'Closed' },
    ],
    addressTitle: 'Find us',
    addressLines: [
      'C/ Pardo Gimeno, 10',
      'Local izquierda',
      '03007 Alicante',
    ],
    neighborhood: 'Benalúa, near Plaza de Navarro Rodrigo.',
    call: 'Call',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    directions: 'Directions',
    instagramCtaTitle: 'Photos from the house, on Instagram.',
    instagramCtaBody:
      'Plates of the day, the menu and the room as we post them on @yamachan.es.',
    instagramCtaButton: 'Follow @yamachan.es',
    footerTag: 'Japanese cooking in Alicante',
    langLabel: 'ES',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
}

export function otherLocale(locale: Locale): Locale {
  switch (locale) {
    case 'es':
      return 'en'
    case 'en':
      return 'es'
    default: {
      const _exhaustive: never = locale
      return _exhaustive
    }
  }
}
