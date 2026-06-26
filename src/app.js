const express = require('express');
const cors = require('cors');
const path = require('path');

const chatRoutes = require('./routes/chat');
const productsRoutes = require('./routes/products');
const uploadRoutes = require('./routes/upload');
const leadRoutes = require('./routes/leads');
const asesoresRoutes = require('./routes/asesores');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/chat', chatRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin/products', productsRoutes);
app.use('/api/admin/products', uploadRoutes);
app.use('/api/admin/leads', leadRoutes);
app.use('/api/admin/asesores', asesoresRoutes);
app.use('/api/asesor', asesoresRoutes);

app.get('/', (req, res) => {
  res.redirect('/muebleBo.dc.html');
});

module.exports = app;
