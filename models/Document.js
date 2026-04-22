const mongoose = require('mongoose');
const slugify = require('slugify');

const documentSchema = new mongoose.Schema({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  fileName:    { type: String, required: true },
  filePath:    { type: String, required: true },
  fileUrl:     { type: String, required: true },
  category: {
    type: String, required: [true, 'Category is required'],
    enum: [
      'financials_annual_reports', 'financials_quarterly_results', 'financials_related_party',
      'disclosures_annual_return', 'disclosures_secretarial', 'disclosures_corporate_governance',
      'disclosures_general_meetings', 'disclosures_newspaper', 'disclosures_others',
      'disclosures_share_capital', 'disclosures_shareholding',
      'listing_information', 'policies', 'sebi_disclosure', 'others',
    ],
  },
  subcategory:   { type: String, default: '' },
  year:          { type: String, default: '' },
  quarter:       { type: String, enum: ['', 'Q1', 'Q2', 'Q3', 'Q4'], default: '' },
  slug:          { type: String, unique: true, sparse: true },
  description:   { type: String, default: '' },
  fileSize:      { type: Number, default: 0 },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive:      { type: Boolean, default: true },
  downloadCount: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-generate unique slug
documentSchema.pre('save', async function(next) {
  if (this.slug) return next();
  const base = slugify(`${this.title} ${this.year || Date.now()}`, { lower: true, strict: true });
  let slug = base;
  let count = 0;
  while (await mongoose.model('Document').findOne({ slug })) {
    count++;
    slug = `${base}-${count}`;
  }
  this.slug = slug;
  next();
});

module.exports = mongoose.model('Document', documentSchema);
