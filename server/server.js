const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Route publique : authentification
app.use('/api/auth', require('./routes/auth'));

// Middleware JWT sur toutes les routes protégées
const auth = require('./middleware/auth');
app.use('/api/articles', auth, require('./routes/articles'));
app.use('/api/factures', auth, require('./routes/factures'));
app.use('/api/contrats', auth, require('./routes/contrats'));
app.use('/api/recus',    auth, require('./routes/recus'));
app.use('/api/company',  auth, require('./routes/company'));

// Servir le frontend React en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/facturedb';

async function createDefaultUser() {
  const User = require('./models/User');

  const users = [
    { username: 'Youka', password: 'Abdiel@2011' },
    { username: 'lama',  password: 'lama' },
  ];

  for (const u of users) {
    const existing = await User.findOne({ username: u.username });
    if (!existing) {
      await User.create(u);
      console.log(`👤 Utilisateur "${u.username}" créé avec succès.`);
    }
  }
}

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connecté à MongoDB:', MONGODB_URI);
    await createDefaultUser();
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion MongoDB:', err);
    process.exit(1);
  });
