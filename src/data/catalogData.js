export const RAW_PRODUCTS = [
    {
        id: "FR-CLE-GAR-001", brand: "GARNIER", name: "Skin Naturals Vitamin C Face Wash", country: "France",
        category: { id: "cleanser", label: "غسول وجه", icon: "soap" }, quantity: "150 ml",
        image: "https://images.openbeautyfacts.org/images/products/890/152/600/5208/front_en.6.400.jpg",
        price: null, // Triggers Bounty
        real_score: 65, safety: 70, efficacy: 60
    },
    {
        id: "OT-LOT-ISD-001", brand: "ISDIN", name: "After Sun Lotion: Calm & Comfort", country: "Other",
        category: { id: "lotion_cream", label: "مرطب", icon: "hand-holding-water" }, quantity: "200 ml",
        image: "https://images.openbeautyfacts.org/images/products/847/000/380/8996/front_es.4.400.jpg",
        price: 4500,
        real_score: 92, safety: 95, efficacy: 88
    },
    {
        id: "US-SHA-JOH-002", brand: "Johnson & Johnson", name: "Johnson's Fuerza y Vitamina Shampoo", country: "USA",
        category: { id: "shampoo", label: "شامبو", icon: "spa" }, quantity: "400 ml",
        image: "https://images.openbeautyfacts.org/images/products/770/203/129/3620/front_en.17.400.jpg",
        price: null, // Triggers Bounty
        real_score: 45, safety: 50, efficacy: 40
    },
    {
        id: "DZ-BWA-LAB-001", brand: "LABO NEDJMA", name: "Flux care Gel douche anti-odeur sport", country: "Algeria",
        category: { id: "body_wash", label: "غسول", icon: "bath" }, quantity: "265 ml",
        image: "https://images.openbeautyfacts.org/images/products/613/054/801/7704/front_en.3.400.jpg",
        price: 650,
        real_score: 78, safety: 80, efficacy: 75
    }
];

export const CATEGORIES = [
    { id: 'all', label: 'الكل', icon: 'layer-group' },
    { id: 'cleanser', label: 'غسول', icon: 'soap' },
    { id: 'lotion_cream', label: 'مرطب', icon: 'hand-holding-water' },
    { id: 'shampoo', label: 'شامبو', icon: 'spa' },
    { id: 'body_wash', label: 'جسم', icon: 'bath' },
];