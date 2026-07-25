const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  console.log('Connected to MongoDB');
  const result = await Vehicle.deleteMany({});
  console.log(`Deleted ${result.deletedCount} vehicles.`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
