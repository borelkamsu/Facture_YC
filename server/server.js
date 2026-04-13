const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/articles', require('./routes/articles'));
app.use('/api/factures', require('./routes/factures'));
app.use('/api/company', require('./routes/company'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facturedb';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB:', MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB:', err);
    process.exit(1);
  });
