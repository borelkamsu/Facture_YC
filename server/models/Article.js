const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  prixUnitaire: {
    type: Number,
    required: false,
    min: 0,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Article', ArticleSchema);
