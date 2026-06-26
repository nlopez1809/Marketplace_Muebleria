require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor InCassa DECO corriendo en http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin.html`);
  console.log(`Tienda: http://localhost:${PORT}/muebleBo.dc.html`);
});
