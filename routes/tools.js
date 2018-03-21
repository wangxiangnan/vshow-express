const appid = 'wxeb143cad4e67f4aa',
			request = require('request'),
	  secret = 'd1502bec2d29d470c8dde60fcac1e6f8',
	WXBizDataCrypt = require('./WXBizDataCrypt');

function getLoginInfo(code, fn){
	let url = 'https://api.weixin.qq.com/sns/jscode2session?'+ `appid=${ appid }&secret=${ secret }&js_code=${ code }&grant_type=authorization_code`;
	request(url, (err, res, body) => {
		console.log(body);
		typeof fn === 'function' && fn(JSON.parse(body));
	});
}


let getAccessToken = {
	data: {
		url: 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&' + `appid=${ appid }&secret=${ secret }`,
		oAccessToken: null
	},

	init(fn){
		let self = this;
		if(self.data.oAccessToken){   //是否有获取过
			let { access_token, expiresStamp } = self.data.oAccessToken;
			let curTimeStamp= Date.now();
			if(curTimeStamp > expiresStamp){  //过期了，重新获取
				self.get(fn);
			}else{  //没有过期
				console.log('没有过期，拿之前的');
				typeof fn === 'function' && fn(access_token);
			}
 		}else{
			self.get(fn);
		}
	},

	check(){

	},

	get(fn){
		let self = this;
		console.log('获取最新access_token');
		let curTimeStamp = Date.now();
		request(self.data.url, (err, res, body) => {
			if(err) return typeof fn === 'function' && fn('');
			body = typeof body === 'string'? JSON.parse(body): body;
			if(body.access_token){  //返回成功
				let { access_token, expires_in } = body;
				typeof fn === 'function' && fn(access_token);
				let expiresStamp = curTimeStamp + expires_in*1000;
				self.data.oAccessToken = {
					access_token, expiresStamp
				};

			}else{  //返回失败
				typeof fn === 'function' && fn('');
			}









			
			
			
		});

	}

};

function getData(iv, encryptedData, session_key, fn){
	var pc = new WXBizDataCrypt(appid, session_key);
	var data = pc.decryptData(encryptedData , iv);
	typeof fn === 'function' && fn(data);
	
}

function formatNumber(n) {
  n = n.toString();
  return n[1] ? n : '0' + n;
}

function formatTime(date) {
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();

  var hour = date.getHours();
  var minute = date.getMinutes();
  var second = date.getSeconds();


  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}


let preciseFormatTime = {
	data: {
		expiresStamp: 120000,  //过期时间为当天24:00
		timePoints: null   //判断的六个时间点， 为对象形式
	},

	get(timeStamp){
		let self = this;
		let PendTimeStamp = Number(timeStamp);
		if(Number.isNaN(PendTimeStamp)) return console.error('请传入正确的时间戳');
		let pendDate = new Date(PendTimeStamp), PendTime, curDate = new Date();
		let { timePoints, expiresStamp} = self.data;
		(!timePoints || expiresStamp < Date.now()) && (timePoints = self.getTimePoint());  //是否时间有效，无效重新获取
		let { beDayStartTimeStamp, beDayEndTimeStamp, nowStartTimeStamp, nowEndTimeStamp, afterDayStartTimeStamp, afterDayEndTimeStamp } = timePoints;
		if( pendDate.getFullYear() === curDate.getFullYear() ){  //同一年
			PendTime = [pendDate.getMonth() + 1, pendDate.getDate()].join('-') + ' ' + [pendDate.getHours(), pendDate.getMinutes()].map(formatNumber).join(':');
		}else{  //不是同一年
			PendTime = [pendDate.getFullYear(), pendDate.getMonth() + 1, pendDate.getDate()].join('-') + ' ' + [pendDate.getHours(), pendDate.getMinutes()].map(formatNumber).join(':');
		}	
		let pendTimeArr = PendTime.split(' ');
		if(PendTimeStamp < beDayStartTimeStamp){  // 前天之前
				return pendTimeArr[0];
			}else if( beDayStartTimeStamp <= PendTimeStamp &&  PendTimeStamp < beDayEndTimeStamp ){  //前天
				return '前天 ' + pendTimeArr[1];
			}else if( beDayEndTimeStamp <= PendTimeStamp &&  PendTimeStamp  < nowStartTimeStamp ){  //昨天
				return '昨天 ' + pendTimeArr[1];
			}else if( nowStartTimeStamp <= PendTimeStamp &&  PendTimeStamp  < nowEndTimeStamp ){  //今天 计算此刻的时间差
				let timeDistanceStamp = Math.abs(Date.now() - PendTimeStamp)/1000;  //以秒为单位
				if(timeDistanceStamp <= 60){  //1分钟前  由小到大
					return '1分钟前'
				}else if(timeDistanceStamp < 3600){  //一小时以内
					return Number.parseInt(timeDistanceStamp/60) + '分钟前'
				}else{
					return Number.parseInt(timeDistanceStamp/3600) + '小时前'
				}
				
			}else if( nowEndTimeStamp <= PendTimeStamp &&  PendTimeStamp  < afterDayStartTimeStamp ){  //明天
				return '明天 ' + pendTimeArr[1];
			}else if( afterDayStartTimeStamp <= PendTimeStamp &&  PendTimeStamp  < afterDayEndTimeStamp ){  //后天
				return '后天 ' + pendTimeArr[1];
			}else if( afterDayEndTimeStamp <= PendTimeStamp ){  //后天以后
				return pendTimeArr[0];
			}
	},

	getTimePoint(){
		console.log('获取最新时间点');
		let self = this;
		//算出6个关键节点的时间戳 1. |前天的起始00:00 2. |前天的结束24:00 3. |今天的起始00:00 4. | 今天的结束24:00 5. | 后天的起始00:00 6.| 后天的结束24:00
		let curDate = new Date();
		self.data.timePoints = {};
		//1
		let beDayTime = [curDate.getFullYear(), curDate.getMonth() + 1, curDate.getDate()-2].map(formatNumber).join('/'); 
		self.data.timePoints.beDayStartTimeStamp = new Date(beDayTime + ' 00:00:00').getTime();
		//2
		self.data.timePoints.beDayEndTimeStamp = new Date(beDayTime + ' 24:00:00').getTime();
		//3
		let nowTime = [curDate.getFullYear(), curDate.getMonth() + 1, curDate.getDate()].map(formatNumber).join('/');
		self.data.timePoints.nowStartTimeStamp = new Date(nowTime+ ' 00:00:00').getTime();
		//4
		self.data.timePoints.nowEndTimeStamp = new Date(nowTime+ ' 24:00:00').getTime();
		//5
		let afterDayTime = [curDate.getFullYear(), curDate.getMonth() + 1, curDate.getDate()+2].map(formatNumber).join('/');
		self.data.timePoints.afterDayStartTimeStamp = new Date(afterDayTime+ ' 00:00:00').getTime();
		//6
		self.data.timePoints.afterDayEndTimeStamp = new Date(afterDayTime+ ' 24:00:00').getTime();	
		self.data.expiresStamp = self.data.timePoints.nowEndTimeStamp;   //过期时间为
		return self.data.timePoints;	
	}
};




module.exports = {
	getLoginInfo, getAccessToken, getData, formatTime, preciseFormatTime
};