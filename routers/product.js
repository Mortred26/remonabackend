const express = require('express');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const { Product } = require('../models/product');
const { Brand } = require('../models/brand');
const multer = require('multer'); // Import multer for file uploads
const fs = require('fs');
const path = require('path');
const Category = require('../models/category');

// Multer configuration for image upload
const upload = multer({ dest: 'uploads/' });

// Route for creating a new product with authentication and image upload
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Ensure that the user is authenticated and has admin rights
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    // Extract product data from request body
    const { name, count, price, oldprice, description, material, category, brand } = req.body;

    // Check if an image was uploaded
    const imagePath = req.file ? req.file.path : ''; // Store file path if uploaded, or empty string if not

    // Check if the category exists
    let existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.status(404).send("Category not found");
    }

    // Check if the brand exists
    let existingBrand = await Brand.findById(brand);
    if (!existingBrand) {
      return res.status(404).send("Brand not found");
    }

    // Create a new product
    const product = new Product({ name, count, price, oldprice, description, material, category, brand, image: imagePath });

    // Save the product to the database
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to update a product by ID with authentication and image upload
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    // Check if an admin is making the request
    if (req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name, count, price, oldprice, description, material, category, brand } = req.body;
    const imagePath = req.file ? req.file.path : null;

    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.status(404).send("Category not found");
    }

    const existingBrand = await Brand.findById(brand);
    if (!existingBrand) {
      return res.status(404).send("Brand not found");
    }

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).send('Product not found');
    }

    // If a new image is uploaded, delete the old image
    if (imagePath && existingProduct.image) {
      fs.unlink(path.join(__dirname, '..', existingProduct.image), (err) => {
        if (err) {
          console.error('Error deleting old image:', err);
        }
      });
    }

    // Update the product details
    existingProduct.name = name;
    existingProduct.count = count;
    existingProduct.price = price;
    existingProduct.oldprice = oldprice;
    existingProduct.description = description;
    existingProduct.material = material;
    existingProduct.category = category;
    existingProduct.brand = brand;
    if (imagePath) {
      existingProduct.image = imagePath;
    }

    await existingProduct.save();

    res.status(200).json(existingProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to delete a product by ID with authentication
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    // Check if an admin is making the request
    if (req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    // Delete the associated image if it exists
    if (product.image) {
      fs.unlink(path.join(__dirname, '..', product.image), (err) => {
        if (err) {
          console.error('Error deleting image:', err);
        }
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to retrieve all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('category brand');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to retrieve a product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category brand');
    if (!product) {
      return res.status(404).send('Product not found');
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
