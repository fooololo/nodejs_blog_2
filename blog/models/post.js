/**
 * New node file
 */
var mongodb = require('./db');
var markdown = require('markdown').markdown;
function Post(name,head,title,tags,post){
	this.name = name;
	this.head = head;
	this.title = title;
	this.tags = tags;
	this.post = post;
}
module.exports = Post;

/**
 * 保存文章函数
 * @param callback
 */
Post.prototype.save = function(callback){
	var date = new Date();
	var time = {
			date : date,
			year : date.getFullYear(),
			month : date.getFullYear() + '-' + (date.getMonth() + 1),
			day : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
			minute : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes() )
	};
	console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>'+time.minute);
	var post = {
			name : this.name,
			head : this.head,
			time : time,
			title : this.title,
			tags : this.tags,
			post : this.post,
			comments : [],
			reprint_info : {},
			pv : 0
	};
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.insert(post,{safe:true},function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};
//获取一个人的全部文章（传入name），或获取所有人的文章
Post.getAll = function(name,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			var query = {};
			if(name){
				query.name = name;
			}
			collection.find(query).sort({time:-1}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
//				docs.forEach(function(doc){
//					doc.post = markdown.toHTML(doc.post);
//				});
				callback(null,docs);
			});
		});
	});
};
//根据用户名、发布日期和文章名获取一篇文章
Post.getOneInHtml = function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		//读取posts集合
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//根据用户名、发布日期和文章名进行查询
			collection.findOne({
				'name' : name,
				'time.day' : day,
				'title' : title
			},function(err,doc){
				if(err){
					mongodb.close();
					return callback(err);
				}
				if(doc){
					//没访问1次，pv增加1
					collection.update({
						'name' : name,
						'time.day' : day,
						'title' : title
					},{
						$inc : {'pv' : 1}
					},function(err){
						mongodb.close();
						if(err){
							return callback(err);
						}
					});
//					doc.post = markdown.toHTML(doc.post);
//					doc.comments.forEach(function(comment){
//						comment.content = markdown.toHTML(comment.content);
//					});
					callback(null,doc);
				}else{
					mongodb.close();
				}
			});
		});
	});
};

//根据用户名、日期和文章名查询文章，返回markdown格式
Post.getInMarkdown = function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.findOne({
				'name' : name,
				'time.day' : day,
				'title' : title
			},function(err,doc){
				mongodb.close();
				if(err){
					return callback(err);
				}
				console.log('doc>'+doc);
				callback(null,doc);
			});
		});
	});
};

//修改blog内容
Post.update = function(name,day,title,post,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.update({
				'name' : name,
				'time.day' : day,
				'title' : title
			},{
				$set : {post : post}
			},
			function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};

//删除一篇blog
Post.remove = function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//查询要删除的文档
			collection.findOne({
				'name' : name,
				'time.day' : day,
				'title' : title
			},function(err,doc){
				if(err){
					mongodb.close();
					return callback(err);
				}
				var reprint_from = '';
				//如果有reprint_from，则该文章是转载来的
				if(doc && doc.reprint_info.reprint_from){
					reprint_from = doc.reprint_info.reprint_from;
				}
				if(reprint_from != ''){
					//更新原文章所在文档的reprint_to
					collection.update({
						'name' : reprint_from.name,
						'time.day' : reprint_from.day,
						'title' : reprint_from.title
					},{
						$pull : {
							'reprint_info.reprint_to' : {
								'name' : name,
								'day' : day,
								'title' : title
							}
						}
					},function(err){
						if(err){
							mongodb.close();
							return callback(err);
						}
					});
				}
			});
			//删除转载来的文章所在的文档
			collection.remove({
				'name' : name,
				'time.day' : day,
				'title' :title
			},{
				w : 1
			},function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};

//分页查询
Post.getByPaging = function(name,page,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			var query = {};
			if(name){
				query.name = name;
			}
			//查询文档数量
			collection.count(query,function(err,total){
				if(err){
					mongodb.close();
					return callback(err);
				}
				collection.find(query,{
					skip : (page - 1) * 10,//跳过前面的
					limit : 10//每页10条
				}).sort({
					time : -1//倒序
				}).toArray(function(err,docs){
					mongodb.close();
					if(err){
						return callback(err);
					}
//					docs.forEach(function(doc,index){
//						doc.post = markdown.toHTML(doc.post);
//					});
					callback(null,docs,total);
				});
			});
		});
	});
};

Post.getAllArchive = function(callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//返回只包含name、time和title属性的文档
			collection.find({},{
				'name' : 1,
				'time' : 1,
				'title' : 1
			}).sort({
				time : -1
			}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,docs);
			});
		});
	});
};
//获取所有标签
Post.getTags = function(callback){
	mongodb.open(function(err,db){
		if(err){
			console.log('err4======'+err);
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				console.log('err3======'+err);
				mongodb.close();
				return callback(err);
			}
			collection.distinct('tags',function(err,docs){
				mongodb.close();
				if(err){
					console.log('err2======'+err);
					return callback(err);
				}
				callback(null,docs);
			});
		});
	});
};

Post.getTag = function(tag,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//查询所有tags数组内包含tag的文档，并返回只含有name,time,title的文档
			collection.find({
				tags : tag
			},{
				'name' : 1,
				'time' : 1,
				'title' : 1
			}).sort({
				time : -1
			}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,docs);
			});
		});
	});
};
Post.search = function(keyword,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			var pattern = new RegExp('^.*' + keyword + '.*$','i');
			collection.find({
				title : pattern
			},{
				'name' : 1,
				'time' : 1,
				'title' : 1
			}).sort({
				time : -1
			}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,docs);
			});
		});
	});
};

//转载并更新原文章和存储转载后的文章
Post.reprint = function(reprint_from,reprint_to,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//找到被转载的文章的原文档
			collection.findOne({
				'name' : reprint_from.name,
				'time.day' : reprint_from.day,
				'title' : reprint_from.title
			},function(err,doc){
				if(err){
					mongodb.close();
					return callback(err);
				}
				var date = new Date();
				var time = {
						date : date,
						year : date.getFullYear(),
						month : date.getFullYear() + '-' + (date.getMonth() + 1),
						day : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
						minute : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes() )
				};
				delete doc._id;
				doc.name = reprint_to.name;
				doc.head = reprint_to.head;
				doc.time = time;
				doc.title = (doc.title.search(/[转载]/) > -1) ? doc.title : '[转载]' + doc.title;
				doc.comments = [];
				doc.reprint_info = {'reprint_from' : reprint_from};
				doc.pv = 0;
				
				//更新被转载的原文档的reprint_info的reprint_to
				collection.update({
					'name' : reprint_from.name,
					'time.day' : reprint_from.day,
					'title' : reprint_from.title
				},{
					$push : {
						'reprint_info.reprint_to' :{
							'name' : doc.name,
							'day' : time.day,
							'title' :doc.title
						}
					}
				},function(err){
					if(err){
						mongodb.close();
						return callback(err);
					}
				});
				
				//将转载生成的副本修改后存入数据库，并返回存储后的文档
				collection.insert(doc,{safe :true},function(err,post){
					mongodb.close();
					if(err){
						return callback(err);
					}
					callback(null,post[0]);
				});
			});
		});
	});
};