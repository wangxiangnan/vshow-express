const mongoose = require('mongoose');
const { vSpaceSchema, formIdSchema, testSchema, askSchema, testPaperSchema, userSchema, commentSchema, userLocationSchema, specialListSchema, matchesSchema} = require('../schemas/index');
const User = mongoose.model('users', userSchema);
const VSpace = mongoose.model('vspaces', vSpaceSchema);
const Comment = mongoose.model('comments', commentSchema);
const FormId = mongoose.model('formids', formIdSchema);
const Test = mongoose.model('tests', testSchema);
const Ask = mongoose.model('asks', askSchema);
const TestPaper = mongoose.model('testpapers', testPaperSchema);
const UserLocation = mongoose.model('location', userLocationSchema);
const SpecialList = mongoose.model('speciallist', specialListSchema);
const Matches = mongoose.model('matches', matchesSchema);


module.exports = {
	VSpace, FormId, Test, Ask, TestPaper,User, Comment, UserLocation, SpecialList, Matches
};

