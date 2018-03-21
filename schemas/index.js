const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userSchema = new Schema({
	nickName: String,
	avatarUrl: String,
	gender: Number,
	country: String,
	province: String,
	city: String,
	language: String,
	openId: String,
	creTime: String
});

const userLocationSchema = new Schema({
	name: String,
	address: String,
	latitude: Number,
	longitude: Number,
	cretime: String
});
const vSpaceSchema = new Schema({
	author:  {type: Schema.Types.ObjectId, ref: 'users'},
	moodText: String,
	moodImg: String,
	cretime: String,
	location: {type: Schema.Types.ObjectId, ref: 'location'},
	comments: [{type: Schema.Types.ObjectId, ref: 'comments'}]
});

const commentSchema = new Schema({
	cont: String,
	author: {type: Schema.Types.ObjectId, ref: 'users'},
	cretime: String
});

const formIdSchema = new Schema({
	uid: Schema.Types.ObjectId,
	openId: String,
	formId: String,
	cretime: String
});

const askSchema = new Schema({
	author: {type: Schema.Types.ObjectId, ref: 'users'},
	isAnonym: Boolean,
	cont: String,
	cretime: String
});

const testPaperSchema = new Schema({
	author: {type: Schema.Types.ObjectId, ref: 'users'},
	quizText: String,
	quizType: String,
	ask: [{type: Schema.Types.ObjectId, ref: 'asks'}],
	cretime: String
});

const testSchema = new Schema({
	cont: String
});

const specialListSchema = new Schema({
	id: Number,
	mainImgUrl: String,
	subImgUrl: String,
	title: String,
	formList: [Schema.Types.Mixed]
});

const matchesSchema = new Schema({ //进行匹配
	author:  {type: Schema.Types.ObjectId, ref: 'users'},
	half:  {type: Schema.Types.ObjectId, ref: 'users'},
	eachOther: Boolean,
	liketime: String,
	cretime: String
});

module.exports = {
	vSpaceSchema, formIdSchema,testSchema, askSchema, testPaperSchema, userSchema, commentSchema, userLocationSchema, specialListSchema, matchesSchema
};