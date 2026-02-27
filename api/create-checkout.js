const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PACKS = {
  'Pack Groupe 3–5 ans': { price: 990 },
  'Pack Solo 3–5 ans': { price: 990 },
  'Pack Groupe 6–8 ans': { price: 990 },
  'Pack Solo 6–8 ans': { price: 990 },
  'Pack Groupe 9–12 ans': { price: 990 },
  'Pack Solo 9–12 ans': { price: 990 },
  'Pack Groupe 12+ ans': { price: 990 },
  'Pack Solo 12+ ans': { price: 990 },
  'Pack Complet 3–5 ans': { price: 1490 },
  'Pack Complet 6–8 ans': { price: 1490 },
  'Pack Complet 9–12 ans': { price: 1490 },
  'Pack Complet 12+ ans': { price: 1490 },
  'Pack Adultes · 3 kits apéro': { price: 1490 },
};

const FOLDERS = {
  'Pack Groupe 3–5 ans': 'https://drive.google.com/drive/folders/1fXab4zsF7km1FgwsH4hbAse_1XwIIjIF?usp=sharing',
  'Pack Solo 3–5 ans': 'https://drive.google.com/drive/folders/10P3kKnPYearRMCiMRKA2Uq-j8LqpbDnA?usp=sharing',
  'Pack Groupe 6–8 ans': 'https://drive.google.com/drive/folders/1au1YpOgUEyb_cVHBOAgEqPHUaUBHMJur?usp=sharing',
  'Pack Solo 6–8 ans': 'https://drive.google.com/drive/folders/1LX2fgL2vcO2eErzS0OXgBJ6l5UxVb2v2?usp=sharing',
  'Pack Groupe 9–12 ans': 'https://drive.google.com/drive/folders/1d4jyehImoxUb_jSpuI5KxMMns_Udrmq1?usp=sharing',
  'Pack Solo 9–12 ans': 'https://drive.google.com/drive/folders/1Mpyqpy-QTpNsVDVBdIF3iwj4nyHaj4Jo?usp=sharing',
  'Pack Groupe 12+ ans': 'https://drive.google.com/drive/folders/1ywKXbBRQzcPIBWXDS3AnbiSslOK3dixK?usp=sharing',
  'Pack Solo 12+ ans': 'https://drive.google.com/drive/folders/11DmW3du7eGGUazp4tAkwc0TtOlAE1MZR?usp=sharing',
  'Pack Complet 3–5 ans': 'https://drive.google.com/drive/folders/1r2dmXXJSGNYY75IZBoH2SJuMg-lLJzOp?usp=sharing',
  'Pack Complet 6–8 ans': 'https://drive.google.com/drive/folders/1laSmAAoFPs-Gz6xN69UEQ24Bdou6BVVM?usp=sharing',
  'Pack Complet 9–12 ans': 'https://drive.google.com/drive/folders/1I6JTLYMa_vhr3y1keR3pVpA8bzeO_npz?usp=sharing',
  'Pack Complet 12+ ans': 'https://drive.google.com/drive/folders/15eLH-sVCV_2AXwBJX93Q-oTO9E-r5QVI?usp=sharing',
  'Pack Adultes · 3 kits apéro': 'https://drive.google.com/drive/folders/1o-aBZZy87NWeFUvq-LDZzmLfBcO3JjJD?usp=sharing',
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { items } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'Panier vide' });

    // Calcul du total en centimes
    const total = items.reduce((sum, item) => {
      const pack = PACKS[item.name];
      if (!pack) throw new Error(`Pack inconnu: ${item.name}`);
      return sum + pack.price;
    }, 0);

    // Réduction -10% si total >= 25€ (2500 centimes)
    const hasDiscount = total >= 2500;
    const discountPercent = hasDiscount ? 10 : 0;

    const line_items = items.map(item => {
      const pack = PACKS[item.name];
      const discountedPrice = hasDiscount
        ? Math.round(pack.price * 0.9)
        : pack.price;
      return {
        price_data: {
          currency: 'eur',
          product_data: { name: item.name },
          unit_amount: discountedPrice,
        },
        quantity: 1,
      };
    });

    // Liens Google Drive
    const folders = items.map(item => FOLDERS[item.name]).filter(Boolean).join('|||');

    const sessionParams = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `https://occupekids.fr/merci.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://occupekids.fr`,
      metadata: { folders },
      locale: 'fr',
      billing_address_collection: 'auto',
    };

    // Ajouter un coupon si réduction
    if (hasDiscount) {
      const coupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: 'once',
        name: '🎉 Réduction -10% multi-packs',
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.status(200).json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
