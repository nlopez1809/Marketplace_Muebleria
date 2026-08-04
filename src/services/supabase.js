const { createClient } = require('@supabase/supabase-js');

let client = null;

function getClient() {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return client;
}

module.exports = new Proxy({}, {
  get(_, prop) {
    return getClient()[prop];
  }
});
