export const restaurant = {
  name: 'Yama-Chan',
  nameJa: '山ちゃん',
  chefPhoto: '/images/chef-masashi.png',
  /** Local 9:16 clip — keeps Instagram chrome off the homepage. */
  chefVideo: '/videos/chef-reel.mp4',
  chefReelUrl: 'https://www.instagram.com/reel/DMQLKHMs94d/',
  instagramUrl: 'https://www.instagram.com/yamachan.es/',
  instagramHandle: '@yamachan.es',
  phone: '+34604949252',
  phoneDisplay: '+34 604 94 92 52',
  whatsapp:
    'https://wa.me/34604949252?text=' +
    encodeURIComponent('Hola, me gustaría reservar mesa en Yama-Chan.'),
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
  nameRomaji: string
  priceCents: number
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
      { id: 'edamame', nameJa: '枝豆', nameRomaji: 'edamame', priceCents: 550, vegetarian: true, image: '/images/dish-edamame.png' },
      { id: 'gyozaPork', nameJa: '餃子', nameRomaji: 'gyōza', priceCents: 850, image: '/images/dish-gyoza.png' },
      { id: 'gyozaVeg', nameJa: '野菜餃子', nameRomaji: 'yasai gyōza', priceCents: 850, vegetarian: true, image: '/images/dish-gyoza-veg.png' },
      { id: 'takoyaki', nameJa: 'たこ焼き', nameRomaji: 'takoyaki', priceCents: 900, image: '/images/dish-takoyaki.jpg' },
      { id: 'mushrooms', nameJa: 'バター醤油きのこ', nameRomaji: 'batā shōyu kinoko', priceCents: 800, vegetarian: true, image: '/images/dish-mushrooms.png' },
    ],
  },
  {
    id: 'sushi',
    items: [
      { id: 'sushi', nameJa: '寿司', nameRomaji: 'sushi', priceCents: 1400, image: '/images/dish-sushi.jpg' },
      { id: 'sashimi', nameJa: '刺身', nameRomaji: 'sashimi', priceCents: 1600, image: '/images/dish-sashimi.jpg' },
      { id: 'hotPhilly', nameJa: 'ホットフィラデルフィア', nameRomaji: 'hotto firaderufia', priceCents: 1300, image: '/images/dish-hot-philly.png' },
    ],
  },
  {
    id: 'mains',
    items: [
      { id: 'katsudon', nameJa: 'カツ丼', nameRomaji: 'katsudon', priceCents: 1350, image: '/images/dish-katsudon.jpg' },
      { id: 'katsuCurry', nameJa: 'カツカレー', nameRomaji: 'katsu karē', priceCents: 1350, image: '/images/dish-katsu-curry.png' },
      { id: 'yakinikuDon', nameJa: '焼肉丼', nameRomaji: 'yakiniku don', priceCents: 1400, image: '/images/dish-yakiniku-don.jpg' },
      { id: 'karaageCurry', nameJa: '唐揚げカレー', nameRomaji: 'karaage karē', priceCents: 1300, image: '/images/dish-karaage-curry.png' },
      { id: 'okonomiyaki', nameJa: 'お好み焼き', nameRomaji: 'okonomiyaki', priceCents: 1200, image: '/images/dish-okonomiyaki.png' },
      { id: 'yakisoba', nameJa: '焼きそば', nameRomaji: 'yakisoba', priceCents: 1200, image: '/images/dish-yakisoba.png' },
      { id: 'tempuraUdon', nameJa: '天ぷらうどん', nameRomaji: 'tempura udon', priceCents: 1300, image: '/images/dish-tempura.jpg' },
      { id: 'friedTofu', nameJa: '稲荷寿司', nameRomaji: 'inari zushi', priceCents: 700, vegetarian: true, image: '/images/dish-fried-tofu.png' },
    ],
  },
  {
    id: 'dessert',
    items: [
      { id: 'appleGyoza', nameJa: 'りんご餃子', nameRomaji: 'ringo gyōza', priceCents: 700, vegetarian: true, image: '/images/dish-apple-gyoza.png' },
      { id: 'mochi', nameJa: '餅', nameRomaji: 'mochi', priceCents: 500, vegetarian: true, image: '/images/dish-mochi.png' },
    ],
  },
  {
    id: 'drinks',
    items: [{ id: 'japaneseBeer', nameJa: 'ビール', nameRomaji: 'bīru', priceCents: 350, image: '/images/dish-japanese-beer.png' }],
  },
]

export function isMenuItemId(value: unknown): value is MenuItemId {
  switch (value) {
    case 'edamame':
    case 'gyozaPork':
    case 'gyozaVeg':
    case 'takoyaki':
    case 'mushrooms':
    case 'sushi':
    case 'hotPhilly':
    case 'katsudon':
    case 'katsuCurry':
    case 'yakinikuDon':
    case 'karaageCurry':
    case 'okonomiyaki':
    case 'yakisoba':
    case 'tempuraUdon':
    case 'friedTofu':
    case 'appleGyoza':
    case 'mochi':
    case 'sashimi':
    case 'japaneseBeer':
      return true
    default:
      return false
  }
}

export function romajiForMenuSlug(slug: string): string {
  if (!isMenuItemId(slug)) {
    return ''
  }
  for (const category of menuCategories) {
    const item = category.items.find((entry) => entry.id === slug)
    if (item) {
      return item.nameRomaji
    }
  }
  return ''
}

export function priceCentsForSlug(slug: string): number {
  if (!isMenuItemId(slug)) {
    return 0
  }
  for (const category of menuCategories) {
    const item = category.items.find((entry) => entry.id === slug)
    if (item) {
      return item.priceCents
    }
  }
  return 0
}
