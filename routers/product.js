const express = require('express');
const router = express.Router();
const authMiddleware = require('../Middleware/authMiddleware');
const { Product } = require('../models/product');
const { Brand } = require('../models/brand');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Category = require('../models/category');

// Multer configuration for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Middleware to serve static files
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Function to check if an image is used by any category or product
const isImageUsed = async (imagePath) => {
  const categories = await Category.find({ image: imagePath });
  const products = await Product.find({ image: imagePath });
  return categories.length > 0 || products.length > 0;
};

// Route for creating a new product with authentication and image upload
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name, count, price, oldprice, description, material, category, brand } = req.body;
    let imagePath = null;

    if (req.file) {
      const relativePath = `uploads/${req.file.originalname}`;
      const fullPath = path.join(__dirname, '../', relativePath);
      if (fs.existsSync(fullPath)) {
        imagePath = relativePath;
      } else {
        imagePath = relativePath;
        fs.renameSync(req.file.path, fullPath);
      }
    }

    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.status(404).send("Category not found");
    }

    const existingBrand = await Brand.findById(brand);
    if (!existingBrand) {
      return res.status(404).send("Brand not found");
    }

    const product = new Product({ name, count, price, oldprice, description, material, category, brand, image: imagePath });
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to update a product by ID with authentication and image upload
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name, count, price, oldprice, description, material, category, brand, image } = req.body;
    let imagePath = null;

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

    let oldImagePath = existingProduct.image;

    if (req.file) {
      const relativePath = `uploads/${req.file.originalname}`;
      const fullPath = path.join(__dirname, '../', relativePath);

      if (fs.existsSync(fullPath)) {
        imagePath = relativePath;
      } else {
        imagePath = relativePath;
        fs.renameSync(req.file.path, fullPath);
      }
    } else if (image && fs.existsSync(path.join(__dirname, '../', image))) {
      imagePath = image;
    }

    existingProduct.name = name || existingProduct.name;
    existingProduct.count = count || existingProduct.count;
    existingProduct.price = price || existingProduct.price;
    existingProduct.oldprice = oldprice || existingProduct.oldprice;
    existingProduct.description = description || existingProduct.description;
    existingProduct.material = material || existingProduct.material;
    existingProduct.category = category || existingProduct.category;
    existingProduct.brand = brand || existingProduct.brand;
    if (imagePath) {
      existingProduct.image = imagePath;
    }

    await existingProduct.save();

    // If the old image is not used by any other product or category, delete it
    if (oldImagePath && oldImagePath !== existingProduct.image) {
      if (!(await isImageUsed(oldImagePath))) {
        fs.unlink(path.join(__dirname, '../', oldImagePath), (err) => {
          if (err) {
            console.error('Error deleting old image:', err);
          }
        });
      }
    }

    res.status(200).json(existingProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to delete a product by ID with authentication
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send('Product not found');
    }

    const oldImagePath = product.image;

    await Product.findByIdAndDelete(req.params.id);

    // Check if the image is used by any other products or categories
    const imageInUse = await isImageUsed(oldImagePath);

    // If the old image is not used by any other product or category, delete it
    if (oldImagePath && !imageInUse) {
      fs.unlink(path.join(__dirname, '../', oldImagePath), (err) => {
        if (err) {
          console.error('Error deleting image:', err);
        }
      });
    }

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
