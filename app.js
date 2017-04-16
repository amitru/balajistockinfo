var express = require("express");
var engines = require("consolidate");
var bodyParser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;
var path = require('path');
var ObjectID = require("mongodb").ObjectID;
var session = require('express-session');

app = express();
assert = require("assert");

app.engine('html', engines.nunjucks);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
//serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({
	extended : false
}));
app.use(session({
	secret : "#ffytyt78"
}));

app.get("/home", function(req, res) {
	console.log("get home called");
	res.render('home');
});

//When user click login button /foliopage url is called..
app.post("/foliopage", function(req, res) {
	var userId = req.session['userid'];
	//Already in session 
	if (userId) {
		getStockDataByUserId(userId, function(result) {
			res.render('foliopage', {
				'stockData' : JSON.stringify(result)
			});
		});
	} else {

		//Get email and pwd & check if it exists in DB
		var emailVal = req.body.email;
		var passwordVal = req.body.password;

		//Fetch Records from DB if any for Stock Data
		MongoClient.connect('mongodb://localhost:27017/stockdb', function(err,
				db) {

			var loginCollection = db.collection("login_data");

			loginCollection.findOne({
				email : emailVal,
				password : passwordVal
			}, function(err, docs) {
				if (docs == null) {
					db.close();
					res.render('home');
				} else {

					req.session.userid = emailVal;

					var stockCollection = db.collection("stock_data");

					stockCollection.find({
						"userid" : req.session.userid
					}).toArray(
							function(err, docs) {
								var stockRecJSON = [];
								for ( var i in docs) {
									
									for ( var s in docs[i].stocks) {
										stockRecJSON.push([
										                   docs[i].stocks[s]._id,
										                   docs[i].stocks[s].scriptName,
										                   docs[i].stocks[s].scriptType,
										                   docs[i].stocks[s].buyDate,
										                   docs[i].stocks[s].buyPrice ]);
									}
								}

								console.log(JSON.stringify(stockRecJSON));
								db.close();
								res.render('foliopage', {
									'stockData' : JSON.stringify(stockRecJSON)
								});
							});

				}
			});
		});
	}
});

app.get("/logoutMe", function(req, res) {
	console.log("Logout called");
	// delete req.session['userid'];
	// req.session.destroy();
	res.render('home');
});

app.post("/deleteRecord", function(req, res, next) {
	var idToDelete = req.body.id;
	console.log("idToDelete-" + idToDelete);
	MongoClient.connect('mongodb://localhost:27017/stockdb', function(err, db) {
		assert.equal(null, err);
		console.log("Connected to MONGODB");
		var movieEntry = db.collection("stock_data");
		movieEntry.remove({
			'_id' : ObjectID(idToDelete)
		}, function(err, docs) {
			console.log("DELETED ENTRY");
			db.close();
		});
	});
	res.redirect(301, '/');
});

app.post("/addRecord", function(req, res, next) {
	var scriptName = req.body.scriptName;
	var scriptType = req.body.scriptType;
	var buyDate = req.body.buyDate;
	var buyPrice = req.body.buyPrice;

	var userId = req.session['userid'];

	console.log("userId=" + userId);

	MongoClient.connect('mongodb://localhost:27017/stockdb', function(err, db) {
		assert.equal(null, err);
		console.log("Connected to MONGODB");
		//Now insert the record//
		var stockEntry = db.collection("stock_data");
		stockEntry.update({
			"userid" : userId
		}, {
			"$push" : {
				"stocks" : {
					'scriptName' : scriptName,
					'scriptType' : scriptType,
					'buyDate' : buyDate,
					'buyPrice' : buyPrice
				}
			}
		}, {
			upsert : true
		}, function(err, docs) {

			db.close();
			res.redirect(307, 'foliopage');
		});
	});

});

app.use(function(req, res) {
	res.sendStatus(404);
});

//Get Stock info for particular user
getStockDataByUserId = function(userId, callback) {

	MongoClient.connect('mongodb://localhost:27017/stockdb', function(err, db) {
		var stockCollection = db.collection("stock_data");

		stockCollection.find({
			"userid" : userId
		}).toArray(
				function(err, docs) {
					var stockRecJSON = [];
					for ( var i in docs) {

						for ( var s in docs[i].stocks) {
							stockRecJSON.push([ docs[i].stocks[s]._id,
							                    docs[i].stocks[s].scriptName,
							                    docs[i].stocks[s].scriptType,
							                    docs[i].stocks[s].buyDate,
							                    docs[i].stocks[s].buyPrice ]);
						}
					}
					db.close();

					callback(stockRecJSON);
				});
	});
}

var server = app.listen(3000, function() {
	var port = server.address().port;
	console.log("Express Running on port " + port);
});
