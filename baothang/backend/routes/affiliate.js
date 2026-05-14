const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const axios = require('axios');

router.get('/offers', auth, async (req, res) => {
  try {
    const resp = await axios.get('https://api.accesstrade.vn/v1/offers', {
      headers: { 'Authorization': 'Token ' + process.env.ACCESSTRADE_API_KEY }
    });
    res.json({ success: true, data: resp.data.data });
  } catch (e) {
    res.json({ success: true, data: [
      { id:1, name:'Shopee', commission:'5%', affiliateLink:'https://shopee.vn' },
      { id:2, name:'Lazada', commission:'3%', affiliateLink:'https://lazada.vn' }
    ]});
  }
});

module.exports = router;
