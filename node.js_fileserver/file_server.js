var http = require("http");
var url = require("url");
var fs = require("fs");

// 用户文件
var userFile = "user.txt";
// 积分文件
var scoreFile = "score.txt";

http.createServer(function(request, response) {
	// 获取请求路径
	var path = url.parse(request.url).path;
	console.info(path);
	// 截取path
	// 判断是否有参数
	var idx = path.indexOf("?");
	console.info(idx);
	if (idx < 0) {
		path = path.substring(1)
	} else
		path = path.substring(1, idx);
	console.info(path);
	// 获取参数
	var params = url.parse(request.url, true).query;
	console.info(params);
   //需要执行的操作
	switch (path) {
	case "register":
		register(params, response);
		break;
	case "login":
		login(params, response);
		break;
	case "record":
		record(params, response);
		break;
	// 返回所有，且按积分从大到小排列
	case "queryRecord":
		queryRecord(params, response);
		break;
	default:
		response.writeHead(200, {
			'Content-Type' : 'application/json;charset=utf-8',
			"Access-Control-Allow-Origin" : '*'
		});
		// 返回消息
		// 未知请求
		var result = new Object();
		result.status = "unknown request";
		response.write(JSON.stringify(result));
		response.end();
		break;
	}
}).listen(8888);

// 服务器打印如下信息
console.log('Server running at http://127.0.0.1:8888/');

// 注册
function register(params, response) {
	var user = params.user;
	var pwd = params.pwd;
	var email = params.email;
	var status = "";
	// 打开文件系统
	if (fs.existsSync(userFile)) {
		// 读取文件内容
		var fileStr = fs.readFileSync(userFile);
		var users = new Array();
		// 判断用户名是否已存在
		if (fileStr != undefined && fileStr != null && fileStr != "") {
			var users = JSON.parse(fileStr);
			for (var i = 0; i < users.length; i++) {
				var u = users[i];
				if (u.user == user) {
					status = "exist";
					break;
				}
			}
		}
		// 如果验证通过，写入用户信息
		if (status == "") {
			var newUser = {
				"user" : user,
				"pwd" : pwd,
				"email" : email
			};
			// 添加新用户
			users.push(newUser);
			fs.writeFileSync(userFile, JSON.stringify(users));
			status = "success";

		}
	} else {
		status = "文件不存在！";
	}

	response.writeHead(200, {
		'Content-Type' : 'application/json;charset=utf-8',
		"Access-Control-Allow-Origin" : '*'
	});
	// 返回消息
	var result = new Object();
	result.status = status;
	response.write(JSON.stringify(result));
	response.end();
}

// 登录
function login(params, response) {
	var user = params.user;
	var pwd = params.pwd;
	var status = "";
	var currentScore = "0";
	// 打开文件系统
	if (fs.existsSync(userFile)) {
		// 读取文件内容
		var fileStr = fs.readFileSync(userFile);
		if (fileStr == undefined || fileStr == null || fileStr == "") {
			status = "notexist";

			response.writeHead(200, {
				'Content-Type' : 'application/json;charset=utf-8',
				"Access-Control-Allow-Origin" : '*'
			});
			// 返回消息
			var result = new Object();
			result.status = status;
			response.write(JSON.stringify(result));
			response.end();
			return;
		}
		var users = JSON.parse(fileStr);
		for (var i = 0; i < users.length; i++) {
			var u = users[i];
			if (u.user == user && u.pwd == pwd) {
				status = "pass";
				// 读取积分数据
				if (fs.existsSync(scoreFile)) {
					// 读取文件内容
					var sfileStr = fs.readFileSync(scoreFile);
					var scores = new Array();
					if (sfileStr != undefined && sfileStr != null
							&& sfileStr != "") {
						scores = JSON.parse(sfileStr);
					}

					// 查询得分
					for (var j = 0; j < scores.length; j++) {
						console.info(scores[j]);
						var score = scores[j];
						if (score.user == user) {
							currentScore = score.score;
							break;
						}
					}
				}
				break;
			}
		}
		// 如果验证通过，写入用户密码
		if (status == "") {
			status = "wrongpwd";
		}
	} else {
		status = "文件不存在！";
	}

	response.writeHead(200, {
		'Content-Type' : 'application/json;charset=utf-8',
		"Access-Control-Allow-Origin" : '*'
	});
	// 返回消息
	var result = new Object();
	result.status = status;
	result.currentScore = currentScore;
	response.write(JSON.stringify(result));
	response.end();
}

// 记录积分
function record(params, response) {
	var user = params.user;
	var score = params.score;
	var status = "";
	// 记录是否找到用户
	var flag = "0";
	// 打开文件系统
	if (fs.existsSync(scoreFile)) {
		// 读取文件内容
		var fileStr = fs.readFileSync(scoreFile);
		var scores = new Array();
		if (fileStr != undefined && fileStr != null && fileStr != "") {
			scores = JSON.parse(fileStr);
			// 查询得分
			for (var i = 0; i < scores.length; i++) {
				var s = scores[i];
				// 替换分数
				if (s.user == user) {
					scores[i].score = score;
					flag = "1";
					break;
				}
			}
		}
		if (flag == "0") {
			var newScore = new Object();
			newScore.user = user;
			newScore.score = score;
			scores.push(newScore);
		}
		fs.writeFileSync(scoreFile, JSON.stringify(scores));

		status = "success";
	} else {
		status = "文件不存在！";
	}

	response.writeHead(200, {
		'Content-Type' : 'application/json;charset=utf-8',
		"Access-Control-Allow-Origin" : '*'
	});
	// 返回消息
	var result = new Object();
	result.status = status;
	response.write(JSON.stringify(result));
	response.end();
}

// 读取积分
function queryRecord(params, response) {
	var status = "";
	// 打开文件系统
	if (fs.existsSync(scoreFile)) {
		// 读取文件内容
		var fileStr = fs.readFileSync(scoreFile);
		var scores = new Array();
		if (fileStr != undefined && fileStr != null && fileStr != "") {
			scores = JSON.parse(fileStr);
			status = JSON.stringify(scores);
			console.info(status);
		}
	} else {
		status = "error";
	}

	response.writeHead(200, {
		'Content-Type' : 'application/json;charset=utf-8',
		"Access-Control-Allow-Origin" : '*'
	});
	// 返回消息
	var result = new Object();
	result.status = status;
	response.write(JSON.stringify(result));
	response.end();
}