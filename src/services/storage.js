const supabase = require('./supabase');

async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
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
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  getAsesores, createAsesor, updateAsesor, deleteAsesor,
  getLeads, createLead, deleteLead,
};
