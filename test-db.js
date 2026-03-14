const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
const dns = require('dns');

dns.setServers(['8.8.8.8']); // Try to use Google DNS

console.log('Testing connection to:', uri);

mongoose.connect(uri)
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB Atlas');
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILURE: Could not connect to MongoDB');
    console.error(err);
    process.exit(1);
  });
