const express = require('express');
const request = require('request');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { VSpace, FormId, Test, TestPaper, User, Comment, Ask, UserLocation, SpecialList } = require('../dbs/index');
const { formatTime, getAccessToken, preciseFormatTime } = require('./tools');
const gm = require('gm');//.subClass({imageMagick: true});
const crypto = require('crypto');  

router.all('/:apiname', (req, res, next)=>{
	//if(!req.session.user) return res.status(401).send('未登录！');
	next();
});

router.get('/getspeciallist', (req, res, next) => {
	SpecialList.find().exec((err, list) => {
		if(err)return res.status(500).send(err);
		res.send(list);
	});
});

router.post('/sendmood', (req, res, next) => {  //发表心情
	if(!req.files && !req.body.moodText) return res.status(400).send('未传任何参数！');
	let { _id } = req.session.user;
	let { moodText, latitude, longitude, address, addressName } = req.body;
	//return console.log(req.files);
	if (req.files){  //有上传图片
		let { moodImg } = req.files;
		crypto.randomBytes(16,function(ex,buf){  
		    var token = buf.toString('hex');  
		    moodImg.mv('public/images/micapp/upload/'+ token + '.jpg', function(err) {
		    	if (err)return res.status(500).send(err);

		    saveToDb('/images/micapp/upload/'+ token + '.jpg');
		  });

		});  
		
		
	  
	}else{		//没有上传图片
		saveToDb('' )
	}

	function saveToDb(moodImg){
		//console.log(moodImg);
		let cretime = formatTime(new Date);
		let vSpace = null;
		if(latitude >= 0){  //有位置信息
			let userLocation = new UserLocation({
						name: addressName,
						address,
						latitude,
						longitude,
						cretime
					});
			userLocation.save((err, result) => {
				if(err) return res.status(500).send(err);
				let vSpace = new VSpace({
							author: _id,
							moodText,
							moodImg,
							location: result,
							cretime
						});
				vSpace.save((err, result) => {
					if(err) return res.status(500).send(err);
					res.send(result);
				});
			});
		}else{   //没有位置信息
			let vSpace = new VSpace({
				author: _id,
				moodText,
				moodImg,
				cretime
			});
			vSpace.save((err, vspace) => {
				if (err) return res.status(500).send(err);
				res.send(vspace);
			});
		}

	
		
	}

});

router.post('/delmood', (req, res, next) => {
	let { id } = req.body;
	let { _id } = req.session.user;
	if(!id)  res.status(400).send('id未传入');
	VSpace.findById(id, (err, result) => {
		if(err) return res.status(500).send('获取失败');
		if(!result) return res.status(400).send('没有这一条数据');
		if(result.author.toString() !== _id) return res.status(400).send('没有删除权限');
		//开始删除
		VSpace.remove({_id: id}, (err, result) => {
			if(err) return res.status(500).send('数据库删除失败');
			res.send(result);
		});

		//删除图片
		if(result.moodImg){
			fs.unlink('public' + result.moodImg);
		}
		//删除评论
		
		if(result.comments.length > 0){  //有评论就删除
			result.comments.forEach(itemId => {
				Comment.remove({_id: itemId}).exec();
			});
		}

		//删除位置
		
		if(result.location){  //有位置就删除
			UserLocation.remove({_id: result.location}).exec();
		}
	});

});

router.get('/getmoodlist', (req, res, next) => {  // vspace = {list: [], start: num}

	let { page = 1, author } = req.query;
	let pageSize = 10;
	let start = (page - 1)*pageSize;
	let query = author? { author } : {};
	let reqSpace = author? req.session[author + 'space']: req.session['all'];

	if(reqSpace && -page !== -1){  //使用老数据
		//console.log('有session');
		let selList = reqSpace.slice(start, pageSize + start);
		let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
		res.send(result);
	}else{ //重新获取moodlist，获取一次
		VSpace.find(query).sort('-_id')
		.populate([{path: 'author', select: 'avatarUrl nickName'},
			{path: 'location', select: 'name latitude longitude'}, 
			{path: 'comments', select: 'cont author',populate: {
				path: 'author',
				select: 'avatarUrl nickName'
			}}

			])
		.exec((err, list)=>{
			if (err) return res.status(500).send(err);
			if(!list.length) return res.send({selList: [], hasMore: false});
			//console.log(list);
			list = list.map(v => {v.cretime = preciseFormatTime.get(new Date(v.cretime).getTime()); return v});
			//reqSpace = list;
			author? req.session[author + 'space'] = list: req.session['all'] = list;
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

router.post('/postcomment', (req, res, next) => {
	let {vSpaceId, comment } = req.body;
	if(!vSpaceId || !comment) return res.status(400).send('参数错误');
	let cretime = formatTime(new Date);
	let comt = new Comment({
		author: req.session.user,
		cont: comment,
		cretime
	});	
	comt.save().then((user) => {
		VSpace.findByIdAndUpdate(vSpaceId, {
	      $addToSet: {
	        comments: user,
	      }
	    },{
	      lean: true
	    }, (err, result) => {
				if(err) return res.status(500).send(err);
				res.send(result);

	    });	
	}). catch((err) => {
		if(err) return res.status(500).send(err);
	});

});

router.post('/saveformid', (req, res, next) => {
	let { formId } = req.body;
	if(!formId) return res.status(400).send('formId为空');
	let { _id, openId} = req.session.user;
	if(!_id || !openId) return res.status(400).send('参数错误');
	let cretime = formatTime(new Date);
	let params = {
		uid: _id,
		openId,
		formId,
		cretime
	};
	FormId.create(params, (err, result) => {
		if(err) return res.status(500).send(err);
		res.send('保存formId成功');
	});

});

router.post('/sendtempmsg', (req, res, next) => {
	let { cid, sendText, uName } = req.body;
	if(!cid || !sendText) return res.status(400).send('cid或sendText为空');
	//console.log(cid);
	FormId.find({uid: cid}).sort('-_id').limit(1).exec((err, items) => {
		if(err) return res.status(500).send(err);
		if(!items[0]) return res.status(204).send('没有更多了');
		let { _id, formId, openId } = items[0];
		let cretime = formatTime(new Date);
		FormId.remove({_id}, (err, result) => {
			//console.log(result);
		});

	  let tempData = {
			  "touser": openId,  //需要发送模板的openid
			  "template_id": 'BcJd9Fw7KN2ALrknK1m3xIcsMJ7qsn-fC6CjjNSRHdY', 
			  "page": "pages/mine/page/vspace/index",          
			  "form_id": formId,      //对方的formid 
			  "data": {
			      "keyword1": {
			          "value": `一条新评论：${ sendText }`, 
			          "color": "#173177"
			      }, 
			      "keyword2": {
			          "value": uName, 
			          "color": "#173177"
			      }, 
			      "keyword3": {
			          "value": cretime, 
			          "color": "#173177"
			      } 
			  }
		};	
		getAccessToken.init(accessToken => {
			if(!accessToken) return res.status(500).send('小程序服务器错误');
			let sendTempUrl = 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + accessToken;
			request({
		    url: sendTempUrl,
		    method: "POST",
		    json: true,
		    headers: {
		        "content-type": "application/json",
		    },
		    body: tempData
				}, function(error, response, body) {
					if(error) return res.status(500).send('小程序服务器错误');
				    res.send(body);
			});
		});


	});

});

router.post('/savequiz', (req, res, next) => {
	let { quizType, quizText } = req.body;
	let { _id } = req.session.user;
	if(!quizType || !quizText) return res.status(204).send('参数不全');
	let cretime = formatTime(new Date);
	let testPaper = new TestPaper({
		author: _id,
		quizText,
		quizType,
		cretime
	});
	testPaper.save((err, result) => {
		if(err) return res.status(500).send(err);
		res.send(result);
	});
});

router.post('/getquiz', (req, res, next) => {
	let { id } = req.body;
	if(!id ) return res.status(204).send('id无效');
	TestPaper.findById(id).populate('author', 'nickName avatarUrl').exec((err, quiz) => {
		if(err) return res.status(500).send(err);
		res.send(quiz);
	});

});

router.get('/getquizlist', (req, res, next) => {
	let { page = 1 } = req.query;
	let pageSize = 10;
	let start = (page - 1)*pageSize;

	if(req.session.vspace && -page !== -1){  //使用老数据
		//console.log('有session');
		let selList = req.session.vspace.slice(start, pageSize + start);
		let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
		res.send(result);
	}else{ //重新获取moodlist，获取一次
		TestPaper.find({author: req.session.user._id}).sort('-_id')
		.populate([{path: 'author', select: 'avatarUrl nickName'}
			, {path: 'ask', select: 'author isAnonym cont cretime',populate: {
				path: 'author',
				select: 'avatarUrl nickName'
			}}

			])
		.exec((err, list)=>{
			if (err) return res.status(500).send(err);
			if(!list.length) return res.send({selList: [], hasMore: false});
			//console.log(list);
			req.session.vspace = list;
			let selList = list.slice(start, pageSize + start);
			let result = {
				selList,
				hasMore: !(selList.length - pageSize)
			};
			res.send(result);
		});
	}

});

router.post('/askquiz', (req, res, next) => {
	let { quizId, askText, isAnonym } = req.body;
	if(!quizId || !askText) return res.status(204).send('参数不全');
	let cretime = formatTime(new Date);
	let { _id } = req.session.user;
	//console.log(_id);
	let ask = new Ask({
		author: _id,
		isAnonym,
		cont: askText,
		cretime
	});
	ask.save((err, result) => {
		if(err) return res.status(500).send(err);
		TestPaper.findByIdAndUpdate(quizId, {
      $addToSet: {
        ask: result
      }
    },{
      lean: true
    }, (err, askRes) => {
			if(err) return res.status(500).send(err);
			res.send(askRes);

    });

	});
});

/*  后台合成图片   */
router.post('/makeimage', (req, res, next) => {

	let { pid, name0, name1, name2, name3 } = req.body;
	pid = Number(pid);
	let randomNum;
	switch(pid){
		case 0:   //制作发光瓶子
			randomNum = Date.now() + '' + Number.parseInt(10000*Math.random());
			gm("public/images/micapp/bottle.jpg")
			.font('public/fonts/ljd.ttf')
			.fontSize(60)
			.fill('#faff03')
			.drawText(90, 154, name0[0])
			.fill('#0bffff')
			.drawText(193, 154, name0[1])
			.fill('#fdb6be')
			.drawText(295, 154, name0[2])
			.write(`public/images/micapp/creimg/${randomNum}.png`, function (err) {
				if(err) return res.status('500').send(err);
			  res.send(`/images/micapp/creimg/${randomNum}.png`);
			});
			/*.toBuffer('PNG',function (err, buffer) {
			  if(err) return res.status('500').send(err), console.log(err);
			  let prefix = "data:image/png" + ";base64,";
			  let base64 = new Buffer(buffer, 'binary').toString('base64');
			  let result = prefix + base64;
			  res.send(result);
			});*/
			
		break;

		case 1:   //制作赵丽颖举牌
			randomNum = Date.now() + '' + Number.parseInt(10000*Math.random());
			gm("public/images/micapp/placards_1.jpg")
			.font('public/fonts/katong.ttf')
			.fontSize(28)
			.fill('#2e3235')
			.drawText(144, 320, name0)
			.drawText(144, 360, name1)
			.write(`public/images/micapp/creimg/${randomNum}.png`, function (err) {
				if(err) return res.status('500').send(err);
			  res.send(`/images/micapp/creimg/${randomNum}.png`);
			});
			/*.toBuffer('PNG',function (err, buffer) {
			  if(err) return res.status('500').send(err), console.log(err);
			  let prefix = "data:image/png" + ";base64,";
			  let base64 = new Buffer(buffer, 'binary').toString('base64');
			  let result = prefix + base64;
			  res.send(result);
			});*/
			
		break;

		case 2:   //制作angela举牌
			randomNum = Date.now() + '' + Number.parseInt(10000*Math.random());
			gm("public/images/micapp/placards_3.png")
			.font('public/fonts/katong.ttf')
			.fontSize(18)
			.fill('#2e3235')
			.drawText(136, 218, name0)
			.drawText(136, 240, name1)
			.write(`public/images/micapp/creimg/${randomNum}.png`, function (err) {
				if(err) return res.status('500').send(err);
			  res.send(`/images/micapp/creimg/${randomNum}.png`);
			});
			/*.toBuffer('PNG',function (err, buffer) {
			  if(err) return res.status('500').send(err), console.log(err);
			  let prefix = "data:image/png" + ";base64,";
			  let base64 = new Buffer(buffer, 'binary').toString('base64');
			  let result = prefix + base64;
			  res.send(result);
			});*/
			
		break;

		default:
			console.log('都没进');
		break;
	}
	
});


router.get('/test', (req, res, next) => {  

	//测试jsonp
	/*let { jsonp } = req.query;
	let info = {
		name: 'test JSONP',
		time: '2017/11/2'
	};
	res.send(`${jsonp}(${ JSON.stringify(info)})`);*/
	
});




module.exports = router;