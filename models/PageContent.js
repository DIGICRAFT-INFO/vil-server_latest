/**
 * PageContent Model
 * Stores all editable content for every page.
 * Each page has multiple "sections" (hero, about, features, etc.)
 * Each section can have: title, subtitle, miniTitle, paragraph, images[], buttons[], isActive
 */
const mongoose = require('mongoose');

// ── Button sub-schema
const buttonSchema = new mongoose.Schema({
  text:   { type: String, default: '' },
  url:    { type: String, default: '#' },
  style:  { type: String, enum: ['primary', 'outline', 'dark'], default: 'primary' },
  openNewTab: { type: Boolean, default: false },
}, { _id: true });

// ── Image sub-schema
const imageSchema = new mongoose.Schema({
  url:     { type: String, required: true },
  alt:     { type: String, default: '' },
  caption: { type: String, default: '' },
  order:   { type: Number, default: 0 },
}, { _id: true });

// ── Section sub-schema (reusable across all pages)
const sectionSchema = new mongoose.Schema({
  sectionKey:  { type: String, required: true },   // e.g. 'hero', 'about', 'products'
  sectionLabel:{ type: String, default: '' },       // Display label in admin
  miniTitle:   { type: String, default: '' },       // Small tag above heading
  title:       { type: String, default: '' },       // Main H1/H2
  subtitle:    { type: String, default: '' },       // Sub-heading
  paragraph:   { type: String, default: '' },       // Body text / description
  paragraph2:  { type: String, default: '' },       // Optional second paragraph
  images:      [imageSchema],                       // 1 or more images
  buttons:     [buttonSchema],                      // CTA buttons
  isActive:    { type: Boolean, default: true },
  order:       { type: Number, default: 0 },
  // Extra fields for specific sections
  extra:       { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: true, timestamps: true });

// ── Main PageContent schema
const pageContentSchema = new mongoose.Schema({
  pageKey:   { type: String, required: true, unique: true }, // 'home','about','products','news','investors','careers'
  pageLabel: { type: String, default: '' },
  sections:  [sectionSchema],
  isActive:  { type: Boolean, default: true },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PageContent', pageContentSchema);
