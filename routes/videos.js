const express = require('express');
const request = require('request');
const router = express.Router();
/* GET home page. */
router.get('/xiaoyu', function(req, res, next) {
  res.render('video', { title: '婚礼视屏', videoUrl: '/videos/wedding.mp4' });
});




module.exports = router;