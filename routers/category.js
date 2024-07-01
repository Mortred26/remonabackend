const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const authMiddleware = require('../Middleware/authMiddleware');
const { Product } = require('../models/product');

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
const isImageUsed = async (imagePath, categoryId) => {
  const categories = await Category.find({ image: imagePath, _id: { $ne: categoryId } });
  const products = await Product.find({ image: imagePath });
  return categories.length > 0 || products.length > 0;
};

// Create a new category with an optional image upload
router.post(
  '/',
  authMiddleware,
  upload.single('image'),
  body('name').custom(async (value) => {
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp('^' + value + '$', 'i') },
    });
    if (existingCategory) {
      throw new Error('This category name already exists');
    }
    return true;
  }),
  async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).send('Access denied. Admin access required.');
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;
      let imagePath = null;

      if (req.file) {
        const relativePath = `uploads/${req.file.originalname}`;
        const fullPath = path.join(__dirname, '../', relativePath);
        if (fs.existsSync(fullPath)) {
          // Use existing image if it already exists
          imagePath = relativePath;
        } else {
          // Save new image
          imagePath = relativePath;
          fs.renameSync(req.file.path, fullPath); // Move file to the correct location
        }
      }

      const category = new Category({ name, image: imagePath });
      await category.save();

      res.status(201).json(category);
    } catch (error) {
      res.status(400).send(error.message);
    }
  }
);

// Retrieve all categories with their images
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    if (!categories) {
      return res.status(404).send('No categories found');
    }
    res.status(200).send(categories);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Retrieve a category by ID with its image
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Category not found');
    }
    res.status(200).send(category);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a category by ID, with optional image update

// Update a category by ID, with optional image update
router.put('/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const { name } = req.body;
    let imagePath = null;

    // Find the existing category
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Category not found');
    }

    let oldImagePath = category.image;

    if (req.file) {
      const relativePath = `uploads/${req.file.originalname}`;
      const fullPath = path.join(__dirname, '../', relativePath);

      // Check if the new image already exists
      if (fs.existsSync(fullPath)) {
        imagePath = relativePath;
      } else {
        // Save new image
        imagePath = relativePath;
        fs.renameSync(req.file.path, fullPath);
      }

      // Delete the old image if it exists and is not used by other categories or products
      if (oldImagePath && !(await isImageUsed(oldImagePath, req.params.id))) {
        fs.unlink(path.join(__dirname, '../', oldImagePath), (err) => {
          if (err) {
            console.error('Error deleting old image:', err);
          }
        });
      }
    } else {
      // No new image uploaded, retain the existing image path
      imagePath = category.image;
    }

    // Update the category with new values
    category.name = name || category.name;
    category.image = imagePath;

    // Save the updated category
    category = await category.save();

    res.status(200).json(category);
  } catch (error) {
    console.error('Error in PUT /:id', error);
    res.status(400).send(error.message);
  }
});


// Delete a category by ID
// Delete a category by ID
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).send('Access denied. Admin access required.');
    }

    const categoryId = req.params.id;

    // Find the category to delete
    const categoryToDelete = await Category.findById(categoryId);
    if (!categoryToDelete) {
      return res.status(404).send('Category not found');
    }

    // Check if the image is used by any other categories or products
    const imageInUse = await isImageUsed(categoryToDelete.image, categoryId);

    if (!imageInUse) {
      // If image is not used by any other categories or products, delete it
      const oldImagePath = path.join(__dirname, '../', categoryToDelete.image);
      fs.unlink(oldImagePath, (err) => {
        if (err) {
          console.error('Error deleting image:', err);
        }
      });
    }

    // Delete the category
    const deletedCategory = await Category.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).send('Category not found');
    }

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /:id', error);
    res.status(500).send(error.message);
  }
});

module.exports = router;
