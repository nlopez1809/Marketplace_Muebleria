const supabase = require('./supabase');

async function getProducts({ includeInactive = true } = {}) {
  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!includeInactive) query = query.neq('active', false);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getDashboard() {
  const [products, leads, asesores] = await Promise.all([
    supabase.from('products').select('id, active, images'),
    supabase.from('leads').select('id, created_at'),
    supabase.from('asesores').select('id'),
  ]);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const leadsThisMonth = (leads.data || []).filter(l => l.created_at >= monthStart).length;
  const activeProducts = (products.data || []).filter(p => p.active !== false).length;
  const withPhotos = (products.data || []).filter(p => p.images && p.images.length > 0).length;
  return {
    totalProducts: (products.data || []).length,
    activeProducts,
    withPhotos,
    totalLeads: (leads.data || []).length,
    leadsThisMonth,
    totalAsesores: (asesores.data || []).length,
  };
}

async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteProduct(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function getAsesores() {
  const { data, error } = await supabase
    .from('asesores')
    .select('*')
    .order('id');
  if (error) throw error;
  return data;
}

async function createAsesor(asesor) {
  const { data, error } = await supabase
    .from('asesores')
    .insert(asesor)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateAsesor(id, updates) {
  const { data, error } = await supabase
    .from('asesores')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteAsesor(id) {
  const { error } = await supabase
    .from('asesores')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function getLeads() {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function createLead(lead) {
  const { data, error } = await supabase
    .from('leads')
    .insert(lead)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteLead(id) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

module.exports = {
  getProducts, getProduct, getDashboard, createProduct, updateProduct, deleteProduct,
  getAsesores, createAsesor, updateAsesor, deleteAsesor,
  getLeads, createLead, deleteLead,
};
