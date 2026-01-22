const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  budgetRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 10000 }
  },
  preferredCapacity: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 50 }
  },
  favoriteYachts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Yacht'
  }],
  bookingHistory: [{
    yacht: { type: mongoose.Schema.Types.ObjectId, ref: 'Yacht' },
    pricePerDay: Number,
    capacity: Number,
    bookedAt: Date
  }],
  searchHistory: [{
    query: String,
    filters: Object,
    timestamp: { type: Date, default: Date.now }
  }],
  lastAnalyzed: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
