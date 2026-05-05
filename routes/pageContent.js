/**
 * Page Content Routes
 * CRUD for all page sections (Home, About, Products, News, Investors, Careers)
 */
const express     = require('express');
const router      = express.Router();
const PageContent = require('../models/PageContent');
const Notification = require('../models/Notification');
const { protect, adminOnly }              = require('../middleware/auth');
const { uploadImage, buildLocalUrl, usingCloudinary } = require('../middleware/upload');
const path = require('path');
const fs   = require('fs');

// ── Multer error wrapper
const multerWrap = (mw) => (req, res, next) =>
  mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());

// ── Default page structures (Keep as is)
const DEFAULT_PAGES = {
  home: {
    pageKey: 'home', pageLabel: 'Home Page',
    sections: [
      {
        sectionKey: 'hero', sectionLabel: 'Hero Banner', order: 1,
        miniTitle: 'Industrial Strength · Sustainable Energy',
        title: 'Integrated Steel Manufacturer in India with Captive Power & Solar Energy',
        subtitle: '',
        paragraph: 'Vaswani Industries Limited is a leading integrated steel manufacturing company in India producing sponge iron, steel billets, rolling mill products, forgings, and casting supported by captive thermal power generation and solar energy infrastructure.',
        images: [],
        buttons: [
          { text: 'Explore Our Businesses', url: '/products/sponge-iron', style: 'primary', openNewTab: false },
          { text: 'Investor Relations', url: '/investors/financials', style: 'outline', openNewTab: false },
        ],
      },
      {
        sectionKey: 'about', sectionLabel: 'About Section', order: 2,
        miniTitle: 'About Us',
        title: 'Leading Integrated Steel Manufacturer in Central India',
        subtitle: '',
        paragraph: 'Vaswani Industries Limited is a publicly listed integrated steel manufacturing company headquartered in Central India. The company operates across the steel value chain including sponge iron manufacturing, steel billet production, rolling mill products, forgings, casting, and captive power generation.',
        images: [],
        buttons: [{ text: 'Discover More', url: '/about/the-company', style: 'primary', openNewTab: false }],
      },
      {
        sectionKey: 'products', sectionLabel: 'Products Section', order: 3,
        miniTitle: 'What We Offer',
        title: 'Our Products',
        subtitle: '',
        paragraph: 'Our leadership assures that we are providing the best quality products possible for our devoted customers.',
        images: [],
        buttons: [],
      },
      {
        sectionKey: 'quote', sectionLabel: 'Quote Banner', order: 4,
        miniTitle: '',
        title: "This is not about creating a giant. It's about creating the sustainability of steel industry.",
        subtitle: '— Vaswani Industries',
        paragraph: '',
        images: [],
        buttons: [],
      },
      {
        sectionKey: 'news', sectionLabel: 'News Section', order: 5,
        miniTitle: 'Latest Updates',
        title: 'News | Media | Events | CSR',
        subtitle: "It's always about the society we serve!",
        paragraph: '',
        images: [],
        buttons: [{ text: 'Read the News', url: '/news', style: 'primary', openNewTab: false }],
      },
    ],
  },
  about: {
    pageKey: 'about', pageLabel: 'About Us',
    sections: [
      {
        sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1,
        miniTitle: '', title: 'About Us', subtitle: '', paragraph: '', images: [], buttons: [],
      },
      {
        sectionKey: 'company', sectionLabel: 'The Company', order: 2,
        miniTitle: 'About Us',
        title: 'Leading Integrated Steel Manufacturer in Central India',
        subtitle: '',
        paragraph: 'Vaswani Industries Limited is a publicly listed integrated steel manufacturing company headquartered in Central India.',
        paragraph2: 'With modern induction furnace operations, energy-efficient manufacturing systems, and solar energy integration, Vaswani Industries supports infrastructure, engineering, and industrial sectors across India.',
        images: [],
        buttons: [{ text: 'Explore Our Products', url: '/products/sponge-iron', style: 'primary', openNewTab: false }],
      },
      {
        sectionKey: 'chairmans_message', sectionLabel: "Chairman's Message", order: 3,
        miniTitle: "Chairman's Message",
        title: 'We are a very subtle organization and we like to create examples from our work.',
        subtitle: '',
        paragraph: 'Over the last two decades the company has continuously diversified its product portfolio to include many customized value added products.',
        images: [],
        buttons: [{ text: 'Explore Our Businesses', url: '/products/sponge-iron', style: 'primary', openNewTab: false }],
      },
      {
        sectionKey: 'vision', sectionLabel: 'Vision', order: 4,
        miniTitle: 'Our Vision',
        title: 'Vision',
        paragraph: 'To be the most trusted, responsible, and sustainable integrated steel manufacturing company in India.',
        images: [], buttons: [],
      },
      {
        sectionKey: 'mission', sectionLabel: 'Mission', order: 5,
        miniTitle: 'Our Mission',
        title: 'Mission',
        paragraph: 'To deliver high-quality steel products through efficient processes, continuous innovation, and a commitment to the well-being of our employees, customers, and communities.',
        images: [], buttons: [],
      },
    ],
  },
  products: {
    pageKey: 'products', pageLabel: 'Our Products',
    sections: [
      { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'Products', images: [], buttons: [] },
      {
        sectionKey: 'forging', sectionLabel: 'Forging Ingots & Billets', order: 2,
        miniTitle: 'Forging Ingots & Billets',
        title: 'High-Quality MS Alloy Ingots & Billets',
        paragraph: 'We produce Forging Quality Ingots of different grades and sizes, with a specialized capacity of 6000 MT. Our expertise includes grades like En-8, En-9, En-24, C-45 and more.',
        images: [], buttons: [{ text: 'Download Product Catalog', url: '#', style: 'dark', openNewTab: false }],
        extra: { quickFact: 'Vaswani Industries Limited is the largest producer of Sponge Iron in Central India.' },
      },
      {
        sectionKey: 'sponge_iron', sectionLabel: 'Sponge Iron (DRI)', order: 3,
        miniTitle: 'Direct Reduced Iron (DRI)',
        title: 'Sponge Iron',
        paragraph: 'Sponge iron, also known as Direct Reduced Iron (DRI), is the product of reducing iron oxide in the form of iron ore into metallic iron.',
        images: [], buttons: [{ text: 'Download Product Catalog', url: '#', style: 'dark', openNewTab: false }],
        extra: { quickFact: 'Vaswani Industries Limited is the largest producer of Sponge Iron in Central India.' },
      },
      {
        sectionKey: 'power', sectionLabel: 'Power Generation', order: 4,
        miniTitle: 'Captive Power Generation',
        title: 'Power Generation',
        paragraph: 'Vaswani Industries operates a captive thermal power plant and solar energy infrastructure to support all manufacturing operations.',
        images: [], buttons: [],
      },
    ],
  },
  news: {
    pageKey: 'news', pageLabel: 'News & Media',
    sections: [
      { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'News & Media', images: [], buttons: [] },
      {
        sectionKey: 'intro', sectionLabel: 'Section Header', order: 2,
        miniTitle: 'Latest News',
        title: 'News & Media',
        subtitle: 'Stay updated with the latest news, events and CSR activities.',
        images: [], buttons: [],
      },
    ],
  },
  investors: {
    pageKey: 'investors', pageLabel: 'Investors',
    sections: [
      { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'Investors', images: [], buttons: [] },
      {
        sectionKey: 'intro', sectionLabel: 'Section Header', order: 2,
        miniTitle: 'Investor Relations',
        title: 'Investor Relations',
        subtitle: 'BSE Listed Company — CIN: L27106CT1994PLC007401',
        paragraph: 'Access all financial documents, disclosures, and regulatory filings of Vaswani Industries Limited.',
        images: [], buttons: [],
      },
    ],
  },
  careers: {
    pageKey: 'careers', pageLabel: 'Careers',
    sections: [
      { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'Careers', images: [], buttons: [] },
      {
        sectionKey: 'intro', sectionLabel: 'Section Header', order: 2,
        miniTitle: 'Join Our Team',
        title: 'Apply For Work',
        subtitle: 'Manpower Requisition & Job Application',
        paragraph: 'Join one of Central India\'s leading steel manufacturers. We offer growth, stability and a collaborative work environment.',
        images: [],
        buttons: [
          { text: 'View Open Positions', url: '#positions', style: 'primary', openNewTab: false },
        ],
      },
    ],
  },
};

// ── Seed page if not exists
async function getOrSeedPage(pageKey) {
  let page = await PageContent.findOne({ pageKey });
  if (!page && DEFAULT_PAGES[pageKey]) {
    page = await PageContent.create(DEFAULT_PAGES[pageKey]);
  }
  return page;
}

// ─────────────────────────────────────────────────────────
// PUBLIC ROUTES
// ─────────────────────────────────────────────────────────

router.get('/:pageKey', async (req, res) => {
  try {
    const page = await getOrSeedPage(req.params.pageKey);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });
    res.json({ success: true, page });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:pageKey/section/:sectionKey', async (req, res) => {
  try {
    const page = await getOrSeedPage(req.params.pageKey);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });
    const section = page.sections.find(s => s.sectionKey === req.params.sectionKey);
    if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });
    res.json({ success: true, section });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    await Promise.all(Object.keys(DEFAULT_PAGES).map(k => getOrSeedPage(k)));
    const pages = await PageContent.find().sort('pageKey').populate('lastEditedBy', 'name');
    res.json({ success: true, pages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── FIXED PUT ROUTE
router.put('/:pageKey/section/:sectionKey', protect, adminOnly,
  multerWrap(uploadImage.array('images', 10)),
  async (req, res) => {
    try {
      let page = await PageContent.findOne({ pageKey: req.params.pageKey });
      if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });

      const idx = page.sections.findIndex(s => s.sectionKey === req.params.sectionKey);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Section not found.' });

      const { miniTitle, title, subtitle, paragraph, paragraph2, isActive, extra } = req.body;
      const section = page.sections[idx];

      if (miniTitle !== undefined) section.miniTitle = miniTitle;
      if (title !== undefined) section.title = title;
      if (subtitle !== undefined) section.subtitle = subtitle;
      if (paragraph !== undefined) section.paragraph = paragraph;
      if (paragraph2 !== undefined) section.paragraph2 = paragraph2;
      if (isActive !== undefined) section.isActive = isActive === 'true' || isActive === true;
      if (extra !== undefined) {
        try { section.extra = typeof extra === 'string' ? JSON.parse(extra) : extra; } catch(e) {}
      }

      if (req.body.buttons) {
        try {
          section.buttons = typeof req.body.buttons === 'string'
            ? JSON.parse(req.body.buttons) : req.body.buttons;
        } catch(e) {}
      }

      // ── FIXED: Image Upload Logic
      if (req.files?.length) {
        const newImages = req.files.map((f, i) => ({
          // Passing req to buildLocalUrl to construct absolute URL
          url: usingCloudinary ? (f.path || f.secure_url) : buildLocalUrl(req, f.filename, 'images'),
          alt: f.originalname.replace(/\.[^.]+$/, ''),
          order: (section.images?.length || 0) + i,
        }));
        section.images = [...(section.images || []), ...newImages];
      }

      // ── FIXED: Image Deletions
      if (req.body.deleteImages) {
        let toDelete = [];
        try { toDelete = JSON.parse(req.body.deleteImages); } catch(e) {}
        
        if (!usingCloudinary) {
            toDelete.forEach(url => {
              if (url.includes('/uploads/images/')) {
                const fname = url.split('/uploads/images/')[1];
                const fp = path.join(__dirname, '../public/uploads/images', fname);
                if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch(e) {}
              }
            });
        }
        section.images = section.images.filter(img => !toDelete.includes(img.url));
      }

      if (req.body.imageOrder) {
        try {
          const order = JSON.parse(req.body.imageOrder);
          section.images = order.map((url, i) => {
            const img = section.images.find(x => x.url === url);
            return img ? { ...img.toObject(), order: i } : null;
          }).filter(Boolean);
        } catch(e) {}
      }

      page.lastEditedBy = req.user._id;
      page.markModified('sections');
      await page.save();

      await Notification.create({
        type: 'page_updated',
        title: 'Page content updated',
        message: `${page.pageLabel} → ${section.sectionLabel || req.params.sectionKey} updated by ${req.user.name}`,
        link: `/dashboard/pages/${req.params.pageKey}`,
        icon: 'edit',
      });

      res.json({ success: true, section: page.sections[idx], message: 'Section updated successfully.' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

router.post('/:pageKey/section', protect, adminOnly, async (req, res) => {
  try {
    const page = await getOrSeedPage(req.params.pageKey);
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });

    const newSection = {
      sectionKey:   req.body.sectionKey || `section_${Date.now()}`,
      sectionLabel: req.body.sectionLabel || 'New Section',
      miniTitle:    req.body.miniTitle   || '',
      title:        req.body.title       || '',
      subtitle:     req.body.subtitle    || '',
      paragraph:    req.body.paragraph   || '',
      images:       [],
      buttons:      [],
      isActive:     true,
      order:        page.sections.length,
    };

    page.sections.push(newSection);
    page.lastEditedBy = req.user._id;
    await page.save();

    res.status(201).json({ success: true, section: page.sections[page.sections.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:pageKey/section/:sectionKey', protect, adminOnly, async (req, res) => {
  try {
    const page = await PageContent.findOne({ pageKey: req.params.pageKey });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });
    page.sections = page.sections.filter(s => s.sectionKey !== req.params.sectionKey);
    await page.save();
    res.json({ success: true, message: 'Section deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.getOrSeedPage = getOrSeedPage;

// /**
//  * Page Content Routes
//  * CRUD for all page sections (Home, About, Products, News, Investors, Careers)
//  */
// const express     = require('express');
// const router      = express.Router();
// const PageContent = require('../models/PageContent');
// const Notification = require('../models/Notification');
// const { protect, adminOnly }              = require('../middleware/auth');
// const { uploadImage, buildLocalUrl, usingCloudinary } = require('../middleware/upload');
// const path = require('path');
// const fs   = require('fs');

// // ── Multer error wrapper
// const multerWrap = (mw) => (req, res, next) =>
//   mw(req, res, err => err ? res.status(400).json({ success: false, message: err.message }) : next());

// // ── Default page structures seeded on first request
// const DEFAULT_PAGES = {
//   home: {
//     pageKey: 'home', pageLabel: 'Home Page',
//     sections: [
//       {
//         sectionKey: 'hero', sectionLabel: 'Hero Banner', order: 1,
//         miniTitle: 'Industrial Strength · Sustainable Energy',
//         title: 'Integrated Steel Manufacturer in India with Captive Power & Solar Energy',
//         subtitle: '',
//         paragraph: 'Vaswani Industries Limited is a leading integrated steel manufacturing company in India producing sponge iron, steel billets, rolling mill products, forgings, and casting supported by captive thermal power generation and solar energy infrastructure.',
//         images: [],
//         buttons: [
//           { text: 'Explore Our Businesses', url: '/products/sponge-iron', style: 'primary', openNewTab: false },
//           { text: 'Investor Relations', url: '/investors/financials', style: 'outline', openNewTab: false },
//         ],
//       },
//       {
//         sectionKey: 'about', sectionLabel: 'About Section', order: 2,
//         miniTitle: 'About Us',
//         title: 'Leading Integrated Steel Manufacturer in Central India',
//         subtitle: '',
//         paragraph: 'Vaswani Industries Limited is a publicly listed integrated steel manufacturing company headquartered in Central India. The company operates across the steel value chain including sponge iron manufacturing, steel billet production, rolling mill products, forgings, casting, and captive power generation.',
//         images: [],
//         buttons: [{ text: 'Discover More', url: '/about/the-company', style: 'primary', openNewTab: false }],
//       },
//       {
//         sectionKey: 'products', sectionLabel: 'Products Section', order: 3,
//         miniTitle: 'What We Offer',
//         title: 'Our Products',
//         subtitle: '',
//         paragraph: 'Our leadership assures that we are providing the best quality products possible for our devoted customers.',
//         images: [],
//         buttons: [],
//       },
//       {
//         sectionKey: 'quote', sectionLabel: 'Quote Banner', order: 4,
//         miniTitle: '',
//         title: "This is not about creating a giant. It's about creating the sustainability of steel industry.",
//         subtitle: '— Vaswani Industries',
//         paragraph: '',
//         images: [],
//         buttons: [],
//       },
//       {
//         sectionKey: 'news', sectionLabel: 'News Section', order: 5,
//         miniTitle: 'Latest Updates',
//         title: 'News | Media | Events | CSR',
//         subtitle: "It's always about the society we serve!",
//         paragraph: '',
//         images: [],
//         buttons: [{ text: 'Read the News', url: '/news', style: 'primary', openNewTab: false }],
//       },
//     ],
//   },
//   about: {
//     pageKey: 'about', pageLabel: 'About Us',
//     sections: [
//       {
//         sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1,
//         miniTitle: '', title: 'About Us', subtitle: '', paragraph: '', images: [], buttons: [],
//       },
//       {
//         sectionKey: 'company', sectionLabel: 'The Company', order: 2,
//         miniTitle: 'About Us',
//         title: 'Leading Integrated Steel Manufacturer in Central India',
//         subtitle: '',
//         paragraph: 'Vaswani Industries Limited is a publicly listed integrated steel manufacturing company headquartered in Central India.',
//         paragraph2: 'With modern induction furnace operations, energy-efficient manufacturing systems, and solar energy integration, Vaswani Industries supports infrastructure, engineering, and industrial sectors across India.',
//         images: [],
//         buttons: [{ text: 'Explore Our Products', url: '/products/sponge-iron', style: 'primary', openNewTab: false }],
//       },
//       {
//         sectionKey: 'chairmans_message', sectionLabel: "Chairman's Message", order: 3,
//         miniTitle: "Chairman's Message",
//         title: 'We are a very subtle organization and we like to create examples from our work.',
//         subtitle: '',
//         paragraph: 'Over the last two decades the company has continuously diversified its product portfolio to include many customized value added products.',
//         images: [],
//         buttons: [{ text: 'Explore Our Businesses', url: '/products/sponge-iron', style: 'primary', openNewTab: false }],
//       },
//       {
//         sectionKey: 'vision', sectionLabel: 'Vision', order: 4,
//         miniTitle: 'Our Vision',
//         title: 'Vision',
//         paragraph: 'To be the most trusted, responsible, and sustainable integrated steel manufacturing company in India.',
//         images: [], buttons: [],
//       },
//       {
//         sectionKey: 'mission', sectionLabel: 'Mission', order: 5,
//         miniTitle: 'Our Mission',
//         title: 'Mission',
//         paragraph: 'To deliver high-quality steel products through efficient processes, continuous innovation, and a commitment to the well-being of our employees, customers, and communities.',
//         images: [], buttons: [],
//       },
//     ],
//   },
//   products: {
//     pageKey: 'products', pageLabel: 'Our Products',
//     sections: [
//       { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'Products', images: [], buttons: [] },
//       {
//         sectionKey: 'forging', sectionLabel: 'Forging Ingots & Billets', order: 2,
//         miniTitle: 'Forging Ingots & Billets',
//         title: 'High-Quality MS Alloy Ingots & Billets',
//         paragraph: 'We produce Forging Quality Ingots of different grades and sizes, with a specialized capacity of 6000 MT. Our expertise includes grades like En-8, En-9, En-24, C-45 and more.',
//         images: [], buttons: [{ text: 'Download Product Catalog', url: '#', style: 'dark', openNewTab: false }],
//         extra: { quickFact: 'Vaswani Industries Limited is the largest producer of Sponge Iron in Central India.' },
//       },
//       {
//         sectionKey: 'sponge_iron', sectionLabel: 'Sponge Iron (DRI)', order: 3,
//         miniTitle: 'Direct Reduced Iron (DRI)',
//         title: 'Sponge Iron',
//         paragraph: 'Sponge iron, also known as Direct Reduced Iron (DRI), is the product of reducing iron oxide in the form of iron ore into metallic iron.',
//         images: [], buttons: [{ text: 'Download Product Catalog', url: '#', style: 'dark', openNewTab: false }],
//         extra: { quickFact: 'Vaswani Industries Limited is the largest producer of Sponge Iron in Central India.' },
//       },
//       {
//         sectionKey: 'power', sectionLabel: 'Power Generation', order: 4,
//         miniTitle: 'Captive Power Generation',
//         title: 'Power Generation',
//         paragraph: 'Vaswani Industries operates a captive thermal power plant and solar energy infrastructure to support all manufacturing operations.',
//         images: [], buttons: [],
//       },
//     ],
//   },
//   news: {
//     pageKey: 'news', pageLabel: 'News & Media',
//     sections: [
//       { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'News & Media', images: [], buttons: [] },
//       {
//         sectionKey: 'intro', sectionLabel: 'Section Header', order: 2,
//         miniTitle: 'Latest News',
//         title: 'News & Media',
//         subtitle: 'Stay updated with the latest news, events and CSR activities.',
//         images: [], buttons: [],
//       },
//     ],
//   },
//   investors: {
//     pageKey: 'investors', pageLabel: 'Investors',
//     sections: [
//       { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'Investors', images: [], buttons: [] },
//       {
//         sectionKey: 'intro', sectionLabel: 'Section Header', order: 2,
//         miniTitle: 'Investor Relations',
//         title: 'Investor Relations',
//         subtitle: 'BSE Listed Company — CIN: L27106CT1994PLC007401',
//         paragraph: 'Access all financial documents, disclosures, and regulatory filings of Vaswani Industries Limited.',
//         images: [], buttons: [],
//       },
//     ],
//   },
//   careers: {
//     pageKey: 'careers', pageLabel: 'Careers',
//     sections: [
//       { sectionKey: 'hero', sectionLabel: 'Page Banner', order: 1, title: 'Careers', images: [], buttons: [] },
//       {
//         sectionKey: 'intro', sectionLabel: 'Section Header', order: 2,
//         miniTitle: 'Join Our Team',
//         title: 'Apply For Work',
//         subtitle: 'Manpower Requisition & Job Application',
//         paragraph: 'Join one of Central India\'s leading steel manufacturers. We offer growth, stability and a collaborative work environment.',
//         images: [],
//         buttons: [
//           { text: 'View Open Positions', url: '#positions', style: 'primary', openNewTab: false },
//         ],
//       },
//     ],
//   },
// };

// // ── Seed page if not exists
// async function getOrSeedPage(pageKey) {
//   let page = await PageContent.findOne({ pageKey });
//   if (!page && DEFAULT_PAGES[pageKey]) {
//     page = await PageContent.create(DEFAULT_PAGES[pageKey]);
//   }
//   return page;
// }

// // ─────────────────────────────────────────────────────────
// // PUBLIC ROUTES
// // ─────────────────────────────────────────────────────────

// // GET /api/pages/:pageKey — get full page content (auto-seeds defaults)
// router.get('/:pageKey', async (req, res) => {
//   try {
//     const page = await getOrSeedPage(req.params.pageKey);
//     if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });
//     res.json({ success: true, page });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // GET /api/pages/:pageKey/section/:sectionKey
// router.get('/:pageKey/section/:sectionKey', async (req, res) => {
//   try {
//     const page = await getOrSeedPage(req.params.pageKey);
//     if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });
//     const section = page.sections.find(s => s.sectionKey === req.params.sectionKey);
//     if (!section) return res.status(404).json({ success: false, message: 'Section not found.' });
//     res.json({ success: true, section });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ─────────────────────────────────────────────────────────
// // ADMIN ROUTES
// // ─────────────────────────────────────────────────────────

// // GET /api/pages — list all pages (admin)
// router.get('/', protect, adminOnly, async (req, res) => {
//   try {
//     // Seed all default pages
//     await Promise.all(Object.keys(DEFAULT_PAGES).map(k => getOrSeedPage(k)));
//     const pages = await PageContent.find().sort('pageKey').populate('lastEditedBy', 'name');
//     res.json({ success: true, pages });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // PUT /api/pages/:pageKey/section/:sectionKey — update a single section (text fields)
// router.put('/:pageKey/section/:sectionKey', protect, adminOnly,
//   multerWrap(uploadImage.array('images', 10)),
//   async (req, res) => {
//     try {
//       let page = await getOrSeedPage(req.params.pageKey);
//       if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });

//       const idx = page.sections.findIndex(s => s.sectionKey === req.params.sectionKey);
//       if (idx === -1) return res.status(404).json({ success: false, message: 'Section not found.' });

//       const { miniTitle, title, subtitle, paragraph, paragraph2, isActive, extra } = req.body;
//       const section = page.sections[idx];

//       if (miniTitle   !== undefined) section.miniTitle  = miniTitle;
//       if (title       !== undefined) section.title      = title;
//       if (subtitle    !== undefined) section.subtitle   = subtitle;
//       if (paragraph   !== undefined) section.paragraph  = paragraph;
//       if (paragraph2  !== undefined) section.paragraph2 = paragraph2;
//       if (isActive    !== undefined) section.isActive   = isActive === 'true' || isActive === true;
//       if (extra       !== undefined) {
//         try { section.extra = typeof extra === 'string' ? JSON.parse(extra) : extra; } catch {}
//       }

//       // Handle buttons
//       if (req.body.buttons) {
//         try {
//           section.buttons = typeof req.body.buttons === 'string'
//             ? JSON.parse(req.body.buttons) : req.body.buttons;
//         } catch {}
//       }

//       // Handle new image uploads
//       if (req.files?.length) {
//         const newImages = req.files.map((f, i) => ({
//           url: usingCloudinary ? (f.path || f.secure_url) : buildLocalUrl('', f.filename, 'images'),
//           alt: f.originalname.replace(/\.[^.]+$/, ''),
//           order: (section.images?.length || 0) + i,
//         }));
//         section.images = [...(section.images || []), ...newImages];
//       }

//       // Handle image deletions (array of URLs to remove)
//       if (req.body.deleteImages) {
//         let toDelete = [];
//         try { toDelete = JSON.parse(req.body.deleteImages); } catch {}
//         section.images = section.images.filter(img => !toDelete.includes(img.url));
//         // Delete physical files
//         toDelete.forEach(url => {
//           if (!usingCloudinary && url.includes('/uploads/images/')) {
//             const fname = url.split('/uploads/images/')[1];
//             const fp = path.join(__dirname, '../public/uploads/images', fname);
//             if (fs.existsSync(fp)) try { fs.unlinkSync(fp); } catch {}
//           }
//         });
//       }

//       // Handle image reorder
//       if (req.body.imageOrder) {
//         try {
//           const order = JSON.parse(req.body.imageOrder);
//           section.images = order.map((url, i) => {
//             const img = section.images.find(x => x.url === url);
//             return img ? { ...img.toObject(), order: i } : null;
//           }).filter(Boolean);
//         } catch {}
//       }

//       page.lastEditedBy = req.user._id;
//       page.markModified('sections');
//       await page.save();

//       // Create notification
//       await Notification.create({
//         type: 'page_updated',
//         title: 'Page content updated',
//         message: `${page.pageLabel} → ${section.sectionLabel || req.params.sectionKey} updated by ${req.user.name}`,
//         link: `/dashboard/pages/${req.params.pageKey}`,
//         icon: 'edit',
//       });

//       res.json({ success: true, section: page.sections[idx], message: 'Section updated successfully.' });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   }
// );

// // POST /api/pages/:pageKey/section — add new section
// router.post('/:pageKey/section', protect, adminOnly, async (req, res) => {
//   try {
//     const page = await getOrSeedPage(req.params.pageKey);
//     if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });

//     const newSection = {
//       sectionKey:   req.body.sectionKey || `section_${Date.now()}`,
//       sectionLabel: req.body.sectionLabel || 'New Section',
//       miniTitle:    req.body.miniTitle   || '',
//       title:        req.body.title       || '',
//       subtitle:     req.body.subtitle    || '',
//       paragraph:    req.body.paragraph   || '',
//       images:       [],
//       buttons:      [],
//       isActive:     true,
//       order:        page.sections.length,
//     };

//     page.sections.push(newSection);
//     page.lastEditedBy = req.user._id;
//     await page.save();

//     res.status(201).json({ success: true, section: page.sections[page.sections.length - 1] });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // DELETE /api/pages/:pageKey/section/:sectionKey
// router.delete('/:pageKey/section/:sectionKey', protect, adminOnly, async (req, res) => {
//   try {
//     const page = await PageContent.findOne({ pageKey: req.params.pageKey });
//     if (!page) return res.status(404).json({ success: false, message: 'Page not found.' });
//     page.sections = page.sections.filter(s => s.sectionKey !== req.params.sectionKey);
//     await page.save();
//     res.json({ success: true, message: 'Section deleted.' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// module.exports = router;
// module.exports.getOrSeedPage = getOrSeedPage;
