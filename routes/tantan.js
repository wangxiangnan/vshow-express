const express = require('express');
const router = express.Router();
const { Matches, User } = require('../dbs/index');
const { formatTime, preciseFormatTime } = require('./tools');

router.all('/:apiname', (req, res, next)=>{
	//if(!req.session.user) return res.status(401).send('未登录！');
	next();
});

router.get('/getmatchlist', (req, res, next) => {  // vspace = {list: [], start: num}  获取探探用户列表

	let { page = 1, gender } = req.query,
	query = { author: req.session.user._id, eachOther: true},
	pageSize = 20,
	reqList = req.session['matchList'],
	start = (page - 1)*pageSize;

	if(reqList && -page !== -1){  //使用老数据
		console.log('有session');
		let selList = reqList.slice(start, pageSize + start);
		let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
		res.send(result);
	}else{ //重新获取moodlist，获取一次
		Matches.find(query)
		.populate('half', 'avatarUrl nickName')
		.exec((err, list)=>{
			if (err) return res.status(500).send(err);
			if(!list.length) return res.send({selList: [], hasMore: false});
			//console.log(list);
			list = list.map(v => {v.cretime = preciseFormatTime.get(new Date(v.liketime).getTime()); return v});
			req.session['matchList'] = list;
			let selList = list.slice(start, pageSize + start);
			//selList = selList.map(v => {v.cretime = preciseFormatTime(new Date(v.cretime).getTime()); return v});

			let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
			res.send(result);
		});
	}


});



router.get('/getmeetlist', (req, res, next) => {  // vspace = {list: [], start: num}  获取探探用户列表

	let { page = 1, gender } = req.query;
	let pageSize = 2000;
	let start = (page - 1)*pageSize;
	let query = gender? { gender } : {};
	let reqSpace = gender === undefined? req.session['meetList']: req.session[ gender + 'meetList'];

	if(reqSpace && -page !== -1){  //使用老数据
		console.log('有session');
		let selList = reqSpace.slice(start, pageSize + start);
		let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
		res.send(result);
	}else{ //重新获取moodlist，获取一次
		User.find(query)
		.select('avatarUrl nickName gender')
		.exec((err, list)=>{
			if (err) return res.status(500).send(err);
			if(!list.length) return res.send({selList: [], hasMore: false});
			//console.log(list);
			gender === undefined? req.session['meetList'] = list: req.session[ gender + 'meetList'] = list;
			let selList = list.slice(start, pageSize + start);
			//selList = selList.map(v => {v.cretime = preciseFormatTime(new Date(v.cretime).getTime()); return v});

			let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
			res.send(result);
		});
	}


});

router.post('/addmatches', (req, res, next) => {   // 探探匹配  写入喜欢，查询是否互相喜欢
	let { half } = req.body;
	let { _id } = req.session.user;
	// 当写入喜欢列表时， 1. 对方是否为正确的用户id， 2. 检查是否之前已添加为喜欢
	User.findById(half,(err, user)=> {
		if(err) return res.status(500).send(err);
		if(!user) return res.status(401).send('对方用户不存在');  //用户不存在
		Matches.findOne({author: _id, half: half}, (err, userLiker) => {
			if(err) return res.status(500).send(err);
			let cretime = formatTime(new Date);
			if(userLiker){  //喜欢之前添加过
				checkMatches();
			}else{  //喜欢第一次添加
				let matches = new Matches({
					author: _id,
					half,
					eachOther: false,
					liketime: '',
					cretime
				});
				matches.save((err, result) => {
					if(err) return res.status(500).send(err);
					checkMatches();
				});
			}

			function checkMatches(){  //检查对方也喜欢你，也就是否配对
				Matches.findOne({author: half, half: _id}, (err, likeUser) => {
					if(!likeUser || err){ //未配对成功
						res.send({ isMatches: false, msg: '没有互相喜欢'});
					}else{  //配对成功了
						likeUser.eachOther = true;
						likeUser.liketime = cretime;
						userLiker.liketime = cretime;
						userLiker.eachOther = true;
						likeUser.save();
						userLiker.save();
						res.send({ isMatches: true, msg: '配对成功', halfId: half});
					}
				});
			}
		});

		
	});
	
});



module.exports = router;