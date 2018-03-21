const express = require('express');
const request = require('request');
const fs = require('fs')
  , gm = require('gm');
const router = express.Router();
/* GET home page. */
router.get('/', function(req, res, next) {
	//res.render('index', { title: 'Express' });
	res.sendFile(process.cwd() + '/public/build/index.html');
});


router.get('/canvas', function(req, res, next) {  //  public/images

	gm("public/images/micapp/creimg/test1.jpg")
	.append('public/images/micapp/creimg/test1.jpg')
	.write('public/images/micapp/creimg/test3.jpg', function (err) {
		console.log(err);
	if(err) res.send(err);
  if (!err) res.send('done');
});


});

module.exports = router;