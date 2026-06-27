require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const data = require('./data.json');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seed() {
  console.log('Insertando productos...');
  for (const p of data.products) {
    const { error } = await supabase.from('products').upsert({
      id: p.id,
      name: p.name,
      cat: p.cat,
      type: p.type,
      price: p.price,
      old: p.old,
      badge: p.badge,
      material: p.material,
      city: p.city,
      rating: p.rating,
      reviews: p.reviews,
      tones: p.tones,
      city2: p.city2,
      dims: p.dims,
      weight: p.weight,
      warranty: p.warranty,
      desc: p.desc,
      images: p.images || [],
    });
    if (error) console.error('Error producto', p.id, error.message);
    else console.log('  +', p.name);
  }

  console.log('Insertando asesores...');
  for (const a of data.asesores) {
    const { error } = await supabase.from('asesores').upsert({
      id: a.id,
      nombre: a.nombre,
      telefono: a.telefono,
    });
    if (error) console.error('Error asesor', a.id, error.message);
    else console.log('  +', a.nombre);
  }

  console.log('Seed completado.');
}

seed().catch(console.error);
