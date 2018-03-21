const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { User } = require('../dbs/index');
const { getData, getLoginInfo, formatTime } = require('./tools');
const fs = require('fs');
const request = require('request');
const crypto = require('crypto');  

/* GET users listing. */   
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
  console.log(req);
});

router.post('/micapp/getuserbysession', (req, res, next) => {
	if(req.session.user){
		let {nickName ='', avatarUrl = '', gender= 2, _id} = req.session.user;
		res.send({nickName, avatarUrl, gender, _id});
	}else{
		res.status(204).send(null);
	}
});

router.post('/micapp/login', (req, res, next) => {
	let { code } = req.body;
	//console.log('login');
	if(!code) return res.status(400).send('参数错误');
	getLoginInfo(code, loginInfo => {
		let { openid,session_key } = loginInfo;
		req.session.weData = loginInfo;
		User.findOne({ openId: openid }, (err, user) => {
			if(user){
				req.session.user = user;
				let {nickName ='', avatarUrl = '', gender= 2, _id} = user;
				res.send({nickName, avatarUrl, gender, _id});
			}else{
				res.status(204).send(null);
			}
			
		});
	});
	
});

router.post('/micapp/reg', (req, res, next) => {
	let { encryptedData, iv } = req.body;
	if(!encryptedData || !iv) return res.status(400).send('iv参数错误');
	if(!req.session.weData)return res.status(400).send('weData参数错误');
	let { openid,session_key } = req.session.weData;
	User.findOne({ openId: openid }, (err, userInfo) => {
		if(!userInfo){  //用户不存在才注册
			getData(iv, encryptedData, session_key, response=>{
				let creTime = formatTime(new Date());
				let { avatarUrl,
								city,
								country,
								gender,
								language,
								nickName,
								openId,
								province } = response;
				let random = Number.parseInt(Math.random()*1000);
				let savedAvatarUrl = `/images/micapp/headimg/${random}${Date.now()}.jpg`;
				request(avatarUrl).pipe(fs.createWriteStream(`./public${savedAvatarUrl}`));
				let user = new User({
								nickName,
								avatarUrl: savedAvatarUrl,
								gender,
								country,
								province,
								city,
								language,
								openId,
								creTime
				});
				user.save((err, users) => {
					if(err){
						res.status(500).send('请求失败');
					}else{
						req.session.user = user;
						let {nickName ='', avatarUrl = '', gender= 2, _id} = users;
						res.send({nickName, avatarUrl, gender, _id});
					}
				});
				
			});
		}else{
			res.send(userInfo);
		}
	});
	
});

//修改用户头像
router.post('/micapp/editavatar', (req, res, next) => {
	//console.log('login');
	if(!req.files) return res.status(400).send('没有图片资源');
	//if(!req.session.user) return res.status(400).send('未登录');
	let { _id } = req.session.user;
	let { avatarUrl } = req.files;
	crypto.randomBytes(16,function(ex,buf){  
	    var token = buf.toString('hex');  
	    avatarUrl.mv('public/images/micapp/headimg/'+ token + '.jpg', function(err) {
	    if (err)return res.status(500).send(err);

		User.findByIdAndUpdate(_id, {
	      avatarUrl: '/images/micapp/headimg/'+ token + '.jpg'
	    },{
	      lean: true
	    }, (err, result) => {
			if(err) return res.status(500).send(err);

			req.session.user.avatarUrl = '/images/micapp/headimg/'+ token + '.jpg';
			res.send('/images/micapp/headimg/'+ token + '.jpg');
			if(/http/.test(result.avatarUrl))return;
			//把之前的图片移动到old里
			let sourceFile  = 'public' + result.avatarUrl;
			let destPath = sourceFile.replace('headimg', 'headimg/old');
			fs.rename(sourceFile, destPath);

	    });	
	  });

	});
	
});

router.post('/getuserinfo', (req, res, next) =>  {   //获取用户信息
	if(!req.session.user) return res.status(401).send('未登录！');
	let { id } = req.body;
	User.findById(id, (err, user) => {
		if (err)return res.status(500).send(err);
		res.send(user);
	});
})

//登录    注册  session

module.exports = router;
