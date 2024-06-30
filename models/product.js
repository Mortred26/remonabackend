const mongoose = require('mongoose');
const { Category } = require('./category');

const productSchema = new mongoose.Schema({
  name: {
    required: true,
    type: String,
  },
  price: {
    required: true,
    type: Number, 
  },
  oldprice: {
    required: true,
    type: Number, 
  },
  description: String,
  material: {
    required: true,
    type: String,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true,
  },
  image: String,
  updateDate: {
    type: Date,
    default: Date.now,
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = { Product };
