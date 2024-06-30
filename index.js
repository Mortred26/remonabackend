const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const app = express();
dotenv.config();

// Middleware
app.use(express.json());
app.use(morgan('tiny'));
app.use(cors());

// Routes
const categoryRouter = require('./routers/category');
const productRouter = require('./routers/product');
const userRouter = require("./routers/users")
const brandRouter = require("./routers/brands")
const authRouter = require('./routers/auth');
const api = process.env.API_URL;

app.use(`${api}category`, categoryRouter);
app.use(`${api}brands`, brandRouter);
app.use(`${api}products`,  productRouter); 
app.use(`${api}users`, userRouter);
app.use(`${api}auth`, authRouter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  dbName: 'furniture-store',
})
  .then(() => {
    console.log('Connected to MongoDB...');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });
// Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
