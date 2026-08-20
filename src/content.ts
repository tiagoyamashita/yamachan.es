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
  whatsappNumber: '34604949252',
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

export type MenuCategoryId = 'starters' | 'sushi' | 'mains' | 'dessert' | 'drinks'

export type MenuItemId =
  | 'edamame'
  | 'gyozaPork'
  | 'gyozaVeg'
  | 'takoyaki'
  | 'mushrooms'
  | 'sushi'
  | 'hotPhilly'
  | 'katsudon'
  | 'katsuCurry'
  | 'yakinikuDon'
  | 'karaageCurry'
  | 'okonomiyaki'
  | 'yakisoba'
  | 'tempuraUdon'
  | 'friedTofu'
  | 'appleGyoza'
  | 'mochi'
  | 'sashimi'
  | 'japaneseBeer'

export type MenuItem = {
  id: MenuItemId
  nameJa: string
  vegetarian?: boolean
  image?: string
}

export type MenuCategory = {
  id: MenuCategoryId
  items: MenuItem[]
}

export const menuCategories: MenuCategory[] = [
  {
    id: 'starters',
    items: [
      { id: 'edamame', nameJa: '枝豆', vegetarian: true },
      { id: 'gyozaPork', nameJa: '餃子', image: '/images/dish-gyoza.png' },
      { id: 'gyozaVeg', nameJa: '野菜餃子', vegetarian: true },
      { id: 'takoyaki', nameJa: 'たこ焼き', image: '/images/dish-takoyaki.png' },
      { id: 'mushrooms', nameJa: 'バター醤油きのこ', vegetarian: true },
    ],
  },
  {
    id: 'sushi',
    items: [
      { id: 'sushi', nameJa: '寿司', image: '/images/dish-sushi.png' },
      { id: 'sashimi', nameJa: '刺身' },
      { id: 'hotPhilly', nameJa: 'ホットフィラデルフィア' },
    ],
  },
  {
    id: 'mains',
    items: [
      { id: 'katsudon', nameJa: 'カツ丼', image: '/images/dish-katsudon.png' },
      { id: 'katsuCurry', nameJa: 'カツカレー' },
      { id: 'yakinikuDon', nameJa: '焼肉丼' },
      { id: 'karaageCurry', nameJa: '唐揚げカレー' },
      { id: 'okonomiyaki', nameJa: 'お好み焼き', image: '/images/dish-okonomiyaki.png' },
      { id: 'yakisoba', nameJa: '焼きそば', image: '/images/dish-yakisoba.png' },
      { id: 'tempuraUdon', nameJa: '天ぷらうどん' },
      { id: 'friedTofu', nameJa: '稲荷寿司', vegetarian: true },
    ],
  },
  {
    id: 'dessert',
    items: [
      { id: 'appleGyoza', nameJa: 'りんご餃子', vegetarian: true },
      { id: 'mochi', nameJa: '餅', vegetarian: true },
    ],
  },
  {
    id: 'drinks',
    items: [{ id: 'japaneseBeer', nameJa: 'ビール' }],
  },
]

export type Copy = {
  metaTitle: string
  metaDescription: string
  nav: {
    carta: string
    historia: string
    fotos: string
    opiniones: string
    visitas: string
    takeout: string
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
  aboutCaption: string
  cartaEyebrow: string
  cartaTitle: string
  cartaLead: string
  cartaCta: string
  cartaPageTitle: string
  cartaPageHeading: string
  cartaPageDescription: string
  cartaPageLead: string
  cartaPageNote: string
  cartaVegLabel: string
  cartaVegNote: string
  cartaVegNotePrefix: string
  cartaLoading: string
  cartaBackHome: string
  takeoutPageTitle: string
  takeoutPageHeading: string
  takeoutPageDescription: string
  takeoutPageLead: string
  takeoutTabMenu: string
  takeoutTabOrder: string
  takeoutAdd: string
  takeoutEmptyOrder: string
  takeoutSeeMenu: string
  takeoutNameLabel: string
  takeoutPhoneLabel: string
  takeoutTimeLabel: string
  takeoutTimePlaceholder: string
  takeoutNotesLabel: string
  takeoutNotesPlaceholder: string
  takeoutSendWhatsapp: string
  takeoutNeedDetails: string
  takeoutNeedItems: string
  takeoutPickupNote: string
  takeoutWhatsappGreeting: string
  takeoutWhatsappName: string
  takeoutWhatsappPhone: string
  takeoutWhatsappTime: string
  takeoutWhatsappNotes: string
  adminPageTitle: string
  adminTitle: string
  adminHeading: string
  adminLead: string
  adminUser: string
  adminPassword: string
  adminSignIn: string
  adminLoginError: string
  adminLogout: string
  adminLoading: string
  adminSave: string
  adminSaved: string
  adminSaveError: string
  adminDelete: string
  adminDeleted: string
  adminDeleteConfirm: string
  adminNewDish: string
  adminUploadPhoto: string
  adminNoPhoto: string
  adminPhotoError: string
  adminNameEs: string
  adminNameEn: string
  adminNameJa: string
  adminBlurbEs: string
  adminBlurbEn: string
  adminCategory: string
  adminSort: string
  adminPublished: string
  adminEmptyCategory: string
  cartaCategories: Record<MenuCategoryId, string>
  cartaItems: Record<MenuItemId, { name: string; blurb: string }>
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
  instagramCtaButton: string
  footerTag: string
  langLabel: string
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
      takeout: 'Para llevar',
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
    aboutCaption: 'Masashi, chef de Yama-Chan',
    cartaEyebrow: 'La carta',
    cartaTitle: 'Lo que la gente vuelve a pedir.',
    cartaLead:
      'Los platos que más salen en las opiniones de Google. Toda la carta está en su página.',
    cartaCta: 'Ver la carta',
    cartaPageTitle: 'La carta — Yama-Chan',
    cartaPageHeading: 'La carta',
    cartaPageDescription:
      'Carta completa de Yama-Chan en Alicante: gyoza, takoyaki, sushi, katsudon, katsu curry y el resto de platos de casa.',
    cartaPageLead:
      'Cocina japonesa de casa. Si un plato no está ese día, te lo decimos al pedir.',
    cartaPageNote: 'Los precios se confirman en mesa.',
    cartaVegLabel: 'Vegetariano',
    cartaVegNote:
      'Platos vegetarianos: edamame, gyoza de verduras, setas, tofu frito relleno de arroz, gyoza de manzana y mochi.',
    cartaVegNotePrefix: 'Platos vegetarianos:',
    cartaLoading: 'Cargando la carta…',
    cartaBackHome: 'Volver al inicio',
    takeoutPageTitle: 'Para llevar — Yama-Chan',
    takeoutPageHeading: 'Para llevar',
    takeoutPageDescription:
      'Pide para llevar en Yama-Chan, Alicante. Elige los platos y envía el pedido por WhatsApp para recoger en el local.',
    takeoutPageLead:
      'Elige los platos y envíanos el pedido por WhatsApp. Recoges en el local, en el horario de comida.',
    takeoutTabMenu: 'Carta',
    takeoutTabOrder: 'Pedido',
    takeoutAdd: 'Añadir',
    takeoutEmptyOrder:
      'Todavía no hay platos en el pedido. Mira la carta y añade lo que quieras recoger.',
    takeoutSeeMenu: 'Ver la carta',
    takeoutNameLabel: 'Nombre',
    takeoutPhoneLabel: 'Teléfono',
    takeoutTimeLabel: 'Hora de recogida',
    takeoutTimePlaceholder: '13:30',
    takeoutNotesLabel: 'Notas',
    takeoutNotesPlaceholder: 'Alergias, sin cebolla, etc.',
    takeoutSendWhatsapp: 'Enviar por WhatsApp',
    takeoutNeedDetails: 'Pon tu nombre y teléfono para enviar el pedido.',
    takeoutNeedItems: 'Añade al menos un plato antes de enviar.',
    takeoutPickupNote:
      'Recogida en C/ Pardo Gimeno, 10. Confirmamos disponibilidad y hora por WhatsApp.',
    takeoutWhatsappGreeting: 'Hola, quiero hacer un pedido para llevar:',
    takeoutWhatsappName: 'Nombre',
    takeoutWhatsappPhone: 'Teléfono',
    takeoutWhatsappTime: 'Hora de recogida',
    takeoutWhatsappNotes: 'Notas',
    adminPageTitle: 'Admin — Yama-Chan',
    adminTitle: 'Admin',
    adminHeading: 'La carta',
    adminLead: 'Edita platos, textos y fotos. Los cambios salen en la carta y en para llevar.',
    adminUser: 'Usuario',
    adminPassword: 'Contraseña',
    adminSignIn: 'Entrar',
    adminLoginError: 'Usuario o contraseña incorrectos.',
    adminLogout: 'Salir',
    adminLoading: 'Cargando…',
    adminSave: 'Guardar',
    adminSaved: 'Guardado.',
    adminSaveError: 'No se ha podido guardar. Prueba otra vez.',
    adminDelete: 'Quitar',
    adminDeleted: 'Plato quitado.',
    adminDeleteConfirm: '¿Quitar este plato de la carta?',
    adminNewDish: 'Plato nuevo',
    adminUploadPhoto: 'Subir foto',
    adminNoPhoto: 'Sin foto',
    adminPhotoError: 'No se ha podido subir la foto.',
    adminNameEs: 'Nombre (ES)',
    adminNameEn: 'Nombre (EN)',
    adminNameJa: 'Nombre (JA)',
    adminBlurbEs: 'Texto (ES)',
    adminBlurbEn: 'Texto (EN)',
    adminCategory: 'Sección',
    adminSort: 'Orden',
    adminPublished: 'Visible en la carta',
    adminEmptyCategory: 'No hay platos en esta sección.',
    cartaCategories: {
      starters: 'Entrantes',
      sushi: 'Sushi',
      mains: 'Platos',
      dessert: 'Postres',
      drinks: 'Bebidas',
    },
    cartaItems: {
      edamame: {
        name: 'Edamame',
        blurb: 'Soja verde con sal. Para abrir mesa.',
      },
      gyozaPork: {
        name: 'Gyoza de cerdo',
        blurb: 'A la plancha, crujientes por debajo.',
      },
      gyozaVeg: {
        name: 'Gyoza de verduras',
        blurb: 'La versión de verduras, también a la plancha.',
      },
      takoyaki: {
        name: 'Takoyaki',
        blurb: 'Bolas de pulpo con salsa, mayonesa y katsuobushi.',
      },
      mushrooms: {
        name: 'Setas con mantequilla',
        blurb: 'Setas a la mantequilla y soja. Plato de verdura de la casa.',
      },
      sushi: {
        name: 'Sushi fresco',
        blurb: 'Pescado de calidad, arroz en su punto. Nigiri y rolls.',
      },
      sashimi: {
        name: 'Sashimi',
        blurb: 'Cortes de pescado fresco, sin arroz. Lo que el mercado deje ese día.',
      },
      hotPhilly: {
        name: 'Hot Philadelphia',
        blurb: 'Roll caliente, de los que más se piden.',
      },
      katsudon: {
        name: 'Katsudon',
        blurb: 'Cerdo empanado sobre arroz, con huevo. El plato que más recomiendan.',
      },
      katsuCurry: {
        name: 'Katsu curry',
        blurb: 'El mismo cerdo empanado, con curry japonés de verdad.',
      },
      yakinikuDon: {
        name: 'Yakiniku don',
        blurb: 'Carne a la plancha sobre arroz.',
      },
      karaageCurry: {
        name: 'Karaage curry',
        blurb: 'Pollo frito japonés con curry de la casa.',
      },
      okonomiyaki: {
        name: 'Okonomiyaki',
        blurb: 'Tortilla japonesa salada, con salsa, aonori y bonito.',
      },
      yakisoba: {
        name: 'Yakisoba',
        blurb: 'Fideos salteados al estilo de casa.',
      },
      tempuraUdon: {
        name: 'Tempura udon',
        blurb: 'Udon en caldo, con tempura.',
      },
      friedTofu: {
        name: 'Tofu frito relleno de arroz',
        blurb: 'Tofu frito relleno de arroz. Plato vegetariano de la casa.',
      },
      appleGyoza: {
        name: 'Gyoza de manzana',
        blurb: 'El postre: gyoza dulce de manzana.',
      },
      mochi: {
        name: 'Mochi',
        blurb: 'Postre de arroz glutinoso, dulce y suave.',
      },
      japaneseBeer: {
        name: 'Cervezas japonesas',
        blurb: 'Cerveza japonesa de nevera. Pregunta cuáles hay ese día.',
      },
    },
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
    instagramCtaButton: 'Seguir',
    footerTag: 'Cocina japonesa en Alicante',
    langLabel: 'EN',
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
      takeout: 'Takeaway',
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
    aboutCaption: 'Masashi, chef of Yama-Chan',
    cartaEyebrow: 'The menu',
    cartaTitle: 'What people come back for.',
    cartaLead:
      'The plates that come up most in the Google reviews. The full menu is on its own page.',
    cartaCta: 'See the menu',
    cartaPageTitle: 'Menu — Yama-Chan',
    cartaPageHeading: 'The menu',
    cartaPageDescription:
      'Full Yama-Chan menu in Alicante: gyoza, takoyaki, sushi, katsudon, katsu curry and the rest of the house plates.',
    cartaPageLead:
      'Home-style Japanese cooking. If a dish is not on that day, we will tell you when you order.',
    cartaPageNote: 'Prices are confirmed at the table.',
    cartaVegLabel: 'Vegetarian',
    cartaVegNote:
      'Vegetarian plates: edamame, vegetable gyoza, mushrooms, fried tofu stuffed with rice, apple gyoza, and mochi.',
    cartaVegNotePrefix: 'Vegetarian plates:',
    cartaLoading: 'Loading the menu…',
    cartaBackHome: 'Back to home',
    takeoutPageTitle: 'Takeaway — Yama-Chan',
    takeoutPageHeading: 'Takeaway',
    takeoutPageDescription:
      'Order takeaway from Yama-Chan in Alicante. Choose your dishes and send the order on WhatsApp for pickup at the restaurant.',
    takeoutPageLead:
      'Choose your dishes and send us the order on WhatsApp. Pickup is at the restaurant, during lunch hours.',
    takeoutTabMenu: 'Menu',
    takeoutTabOrder: 'Order',
    takeoutAdd: 'Add',
    takeoutEmptyOrder:
      'There are no dishes in the order yet. Open the menu and add what you want to pick up.',
    takeoutSeeMenu: 'See the menu',
    takeoutNameLabel: 'Name',
    takeoutPhoneLabel: 'Phone',
    takeoutTimeLabel: 'Pickup time',
    takeoutTimePlaceholder: '13:30',
    takeoutNotesLabel: 'Notes',
    takeoutNotesPlaceholder: 'Allergies, no onion, etc.',
    takeoutSendWhatsapp: 'Send on WhatsApp',
    takeoutNeedDetails: 'Add your name and phone number to send the order.',
    takeoutNeedItems: 'Add at least one dish before sending.',
    takeoutPickupNote:
      'Pickup at C/ Pardo Gimeno, 10. We confirm availability and time on WhatsApp.',
    takeoutWhatsappGreeting: 'Hello, I would like to place a takeaway order:',
    takeoutWhatsappName: 'Name',
    takeoutWhatsappPhone: 'Phone',
    takeoutWhatsappTime: 'Pickup time',
    takeoutWhatsappNotes: 'Notes',
    adminPageTitle: 'Admin — Yama-Chan',
    adminTitle: 'Admin',
    adminHeading: 'The menu',
    adminLead: 'Edit dishes, copy and photos. Changes show on the menu and takeaway pages.',
    adminUser: 'Username',
    adminPassword: 'Password',
    adminSignIn: 'Sign in',
    adminLoginError: 'Wrong username or password.',
    adminLogout: 'Sign out',
    adminLoading: 'Loading…',
    adminSave: 'Save',
    adminSaved: 'Saved.',
    adminSaveError: 'Could not save. Try again.',
    adminDelete: 'Remove',
    adminDeleted: 'Dish removed.',
    adminDeleteConfirm: 'Remove this dish from the menu?',
    adminNewDish: 'New dish',
    adminUploadPhoto: 'Upload photo',
    adminNoPhoto: 'No photo',
    adminPhotoError: 'Could not upload the photo.',
    adminNameEs: 'Name (ES)',
    adminNameEn: 'Name (EN)',
    adminNameJa: 'Name (JA)',
    adminBlurbEs: 'Text (ES)',
    adminBlurbEn: 'Text (EN)',
    adminCategory: 'Section',
    adminSort: 'Order',
    adminPublished: 'Visible on the menu',
    adminEmptyCategory: 'No dishes in this section.',
    cartaCategories: {
      starters: 'Starters',
      sushi: 'Sushi',
      mains: 'Mains',
      dessert: 'Desserts',
      drinks: 'Drinks',
    },
    cartaItems: {
      edamame: {
        name: 'Edamame',
        blurb: 'Salted green soybeans. To start the table.',
      },
      gyozaPork: {
        name: 'Pork gyoza',
        blurb: 'Pan-fried, crisp on the bottom.',
      },
      gyozaVeg: {
        name: 'Vegetable gyoza',
        blurb: 'The vegetable version, also pan-fried.',
      },
      takoyaki: {
        name: 'Takoyaki',
        blurb: 'Octopus balls with sauce, mayo and katsuobushi.',
      },
      mushrooms: {
        name: 'Butter mushrooms',
        blurb: 'Mushrooms with butter and soy. The house vegetable plate.',
      },
      sushi: {
        name: 'Fresh sushi',
        blurb: 'Good fish, rice done right. Nigiri and rolls.',
      },
      sashimi: {
        name: 'Sashimi',
        blurb: 'Fresh sliced fish, no rice. Whatever the market brings that day.',
      },
      hotPhilly: {
        name: 'Hot Philadelphia',
        blurb: 'A hot roll, one of the ones people ask for most.',
      },
      katsudon: {
        name: 'Katsudon',
        blurb: 'Breaded pork over rice, with egg. The dish most people recommend.',
      },
      katsuCurry: {
        name: 'Katsu curry',
        blurb: 'The same breaded pork, with proper Japanese curry.',
      },
      yakinikuDon: {
        name: 'Yakiniku don',
        blurb: 'Grilled meat over rice.',
      },
      karaageCurry: {
        name: 'Karaage curry',
        blurb: 'Japanese fried chicken with the house curry.',
      },
      okonomiyaki: {
        name: 'Okonomiyaki',
        blurb: 'Savoury Japanese pancake with sauce, aonori and bonito.',
      },
      yakisoba: {
        name: 'Yakisoba',
        blurb: 'House-style fried noodles.',
      },
      tempuraUdon: {
        name: 'Tempura udon',
        blurb: 'Udon in broth, with tempura.',
      },
      friedTofu: {
        name: 'Fried tofu stuffed with rice',
        blurb: 'Fried tofu pouches filled with rice. A house vegetarian plate.',
      },
      appleGyoza: {
        name: 'Apple gyoza',
        blurb: 'Dessert: a sweet apple gyoza.',
      },
      mochi: {
        name: 'Mochi',
        blurb: 'A sweet, soft glutinous-rice dessert.',
      },
      japaneseBeer: {
        name: 'Japanese beers',
        blurb: 'Japanese beer from the fridge. Ask which ones we have that day.',
      },
    },
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
    instagramCtaButton: 'Follow',
    footerTag: 'Japanese cooking in Alicante',
    langLabel: 'ES',
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
