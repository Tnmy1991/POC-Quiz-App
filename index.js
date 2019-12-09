const express = require('express')
const bodyParser = require("body-parser")
const path = require('path')
const PORT = process.env.PORT || 5000
const session = require('express-session');
const flash = require('express-flash')
const Mongo = require("mongodb");
const MongoClient = Mongo.MongoClient
const uri = process.env.MONGOLAB_URI || "mongodb+srv://admin:admin%23123@cluster0-kdxz2.mongodb.net/quizDatabase?retryWrites=true&w=majority";

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.urlencoded({ extende: true }))
  .use(bodyParser.json())
  .use(session({ cookie: { maxAge: 60000 }, 
    secret: 'woot',
    resave: false, 
    saveUninitialized: false}))
  .use(flash())
  .use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  })
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => {
    let id = typeof req.query.id != "undefined" ? req.query.id : null;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.')
        res.redirect(301, '/');
      }
      const collection = client.db("quizDatabase").collection("quizMaterials");
      collection.find({}).toArray((error, result) => {
        if(error) {
          req.flash('error', 'Something went wrong. Please, try again after a little bit.')
          res.redirect(301, '/');
        }
        client.close();
        res.render('pages/index', { 
          success_msg: req.flash('success'), 
          error_msg: req.flash('error'), 
          notify_msg: req.flash('notify'),
          questions: result,
          edit_id: id
        })
      });
    });
  })
  .get('/v1/init', (req, res) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.')
        res.redirect(301, '/');
      }
      const collection = client.db("quizDatabase").collection("quizMaterials");
      collection.aggregate([{$sample: {size: 5}}, {$project: {question: 1, options: 1, point: 1, time_limit: 1}}]).toArray((error, result) => {
        if(error) {
          req.flash('error', 'Something went wrong. Please, try again after a little bit.')
          res.redirect(301, '/');
        }
        client.close();
        res.json(result);
      });
    });
  })
  .post('/v1/submission', (req, res) => {
    let answer = req.body.answer;
    let questionIds = [];
    for (let key in answer){
      if(answer.hasOwnProperty(key)){
        let id = new Mongo.ObjectID(key);
        questionIds.push(id);
      }
    }
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.')
        res.redirect(301, '/');
      }
      const collection = client.db("quizDatabase").collection("quizMaterials");
      collection.find({_id: {$in: questionIds}}).project({ _id: 1, question: 1, correct_ans: 1, point: 1 }).toArray((error, result) => {
        client.close();
        if(error) {
          console.log(error);
          res.sendStatus(500);
          res.send('Something went wrong. Please, try again after a little bit.');
        }
        let points = totalPoints = 0;
        let response = [];
        result.forEach(value => {
          totalPoints += parseInt(value.point);
          if(value.correct_ans === answer[value._id]) {
            points += parseInt(value.point);
            value.status = true;
          } else {
            value.status = false;
          }
          response.push(value);
        });
        res.json({
          msg: 'You got ' + points + ' out of ' + totalPoints + '.',
          data: response
        });
      });
    });
  })
  .post('/process', (req, res) => {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    client.connect(err => {
      if(err) {
        req.flash('error', 'Something went wrong. Please, try again after a little bit.')
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
            req.flash('error', 'Something went wrong. Unable to save question.')
            res.redirect(301, '/');
          }
          if(result) {
            req.flash('success', 'A new question successfully added.')
            res.redirect(301, '/');
          };
        });
      } else if( req.body.action === 'edit' ) {
        let id = new Mongo.ObjectID(req.body.id);
        collection.updateOne(
          { _id: id },
          {
            $set: { 
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
            },
            $currentDate: { lastModified: true }
          }, function(error, result) {
            client.close();
            if(error) {
              req.flash('error', 'Something went wrong. Unable to save question.')
              res.redirect(301, '/');
            }
            if(result) {
              req.flash('success', 'Your changes are saved successfully.')
              res.redirect(301, '/');
            };
          }
        );
      } else if( req.body.action === 'delete' ) {
        let id = new Mongo.ObjectID(req.body.id);
        collection.deleteOne({ _id: id }, function(error, result) {
          client.close();
          if(error) {
            req.flash('error', 'Something went wrong. Unable to delete question.')
            res.redirect(301, '/');
          }
          if(result) {
            req.flash('success', 'you\'ve successfully delete an question.')
            res.redirect(301, '/');
          };
        });
      }
    });
  })
  .listen(PORT, () => {
    console.log('Listening  to  port ' + PORT)
  });