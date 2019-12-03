const express = require('express');
const bodyParser = require("body-parser");
const path = require('path');
const PORT = process.env.PORT || 5000;
const session = require('express-session');
const flash = require('express-flash');
const Mongo = require("mongodb");
const MongoClient = Mongo.MongoClient;
const uri = "mongodb+srv://admin:admin%23123@cluster0-kdxz2.mongodb.net/quizDatabase?retryWrites=true&w=majority";

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.urlencoded({ extende: true }))
  .use(session({ cookie: { maxAge: 60000 }, 
    secret: 'woot',
    resave: false, 
    saveUninitialized: false}))
  .use(flash())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.');
        res.redirect(301, '/');
      }
      const collection = client.db("quizDatabase").collection("quizMaterials");
      collection.find({}).toArray((error, result) => {
        if(error) {
          req.flash('error', 'Something went wrong. Please, try again after a little bit.');
          res.redirect(301, '/');
        }
        client.close();
        res.render('pages/index', { 
          success_msg: req.flash('success'), 
          error_msg: req.flash('error'), 
          notify_msg: req.flash('notify'),
          questions: result
        });
      });
    });
  })
  .get('/edit', (req, res) => {
    let id = new Mongo.ObjectID(req.query.id);
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.');
        res.redirect(301, '/');
      }
      const collection = client.db("quizDatabase").collection("quizMaterials");
      collection.find({ '_id': id }).toArray((error, result) => {
        if(error) {
          req.flash('error', 'Something went wrong. Please, try again after a little bit.');
          res.redirect(301, '/');
        }
        client.close();
        res.render('pages/question-edit', { 
          success_msg: req.flash('success'), 
          error_msg: req.flash('error'), 
          notify_msg: req.flash('notify'),
          question: result
        });
      });
    });
  })
  .post('/add', (req, res) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.');
        res.redirect(301, '/');
      }
      const collection = client.db("quizDatabase").collection("quizMaterials");
      if( req.body.action === 'add_new' ) {
        collection.insertOne({
          question: req.body.question,
          options: [
            { key: "A", label: req.body.option_a },
            { key: "B", label: req.body.option_b },
            { key: "C", label: req.body.option_c },
            { key: "D", label: req.body.option_d }
          ],
          correct_ans: req.body.correct_option,
          point: req.body.point,
          time_limit: req.body.time_limit
        }, function(error, result) {
          client.close();
          if(error) {
            req.flash('error', 'Something went wrong. Unable to save question.');
            res.redirect(301, '/');
          }
          if(result) {
            req.flash('success', 'A new question successfully added.');
            res.redirect(301, '/');
          };
        });
      }
    });
  })
  .listen(PORT, () => {
    console.log('Express server listening on port ', PORT);
  })