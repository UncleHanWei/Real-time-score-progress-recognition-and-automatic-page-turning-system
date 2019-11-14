var express = require('express');
var router = express.Router();
//Import the mongoose module
var mongoose = require('mongoose');

//Set up default mongoose connection
var mongoDB = 'mongodb://localhost:27017/mymondb';
mongoose.connect(mongoDB, { useNewUrlParser: true });
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;
// var scoreSchema = new Schema({
//   tags: String,
//   name: String
// });
var scoreSchema = new Schema({
  tags: [],
  youtube: String,
  name: String,
  author: String,
  key: String,
  capo: String,
  play: String,
  intro: [],
  verse: {
    A: {
      lyric: [],
      chord: []
    }
  },
  pre: {
    A: {
      lyric: [],
      chord: []
    }
  },
  chorus: {
    A: {
      lyric: [],
      chord: []
    }
  },
  inter: {
    A: {
      lyric: [],
      chord: []
    }
  },
  bridge: {
    lyric: [],
    chord: []
  },
  ending: {
    lyric: [],
    chord: []
  },
  outro: [],
  progress: []
}, { strict: false });
var scoreModel = mongoose.model('scoreDB', scoreSchema);




var preLoadScoreInfo;
// 預先載入資料庫中樂譜的基本資訊(id 和 tags) 用以搜尋
scoreModel.find({}, { tags: 1, name: 1, author: 1 }, function (err, docs) {
  if (err) console.log(err);
  console.log(docs);
  preLoadScoreInfo = docs;
});

// 搜尋樂曲
router.get('/search_result', function (req, res, next) {
  console.log('This is preLoadScoreInfo====================>', preLoadScoreInfo);
  console.log(req.query);
  let formData = req.query['search'];
  console.log('formData:===================', formData);

  // 用 formData 對 preLoad 做搜尋
  // 列出所有符合 formData 的 tags 的項目 的 id 還有 name
  // 回傳給前端的資料是 id 跟 name
  // 前端依照 name 做顯示 讓使用者點擊歌名 才會依照該歌名的 id 往資料庫撈出完整的資料

  let findResult = Array();
  let count = 0;
  for (let i = 0; i < preLoadScoreInfo.length; i++) {
    for (let j = 0; j < preLoadScoreInfo[i].tags.length; j++) {
      if (preLoadScoreInfo[i].tags[j].includes(formData)) {
        findResult.push(preLoadScoreInfo[i]);
        count += 1;
      }
    }
  }
  console.log(findResult);
  console.log("Count of result ==> ", count);
  if (count == 0) {
    let msg = `
    <div class="row m-5">
      <div class="col-md-12">
        <h4 id="msg" class="text-center"><a class="text-dark" href="/">查無結果，點此返回首頁</a></h4>
      </div>
    </div>`
    res.render('search_result', { title: '搜尋結果', result: '', noResult: msg });
  }
  res.render('search_result', { title: '搜尋結果', result: findResult, noResult: '' });
});

// 接 我要更多資訊 的 request
router.get('/score', function (req, res, next) {

  let formData = req.query['scoreId'];
  console.log("這是新的 formData", formData);

  let score;
  scoreModel.find({ _id: formData }, { _id: 0 }, function (err, docs) {
    if (err) console.log(err);
    console.log('查詢結果：', docs);
    // 把搜尋出來的資料作整理
    score = docs[0];
    console.log(score.name);
    res.render('score', { title: score.author + ' - ' + score.name, score: score });
  });
});

router.post('/InsertScore', function (req, res, next) {
  let formData = JSON.parse(req.body['score']);
  // console.log('=============>',(formData));
  console.log('=============>', typeof (formData));
  // var doc = ({
  //   "tags": '林俊傑',
  //   "name": '修煉愛情'
  // });

  // 新增資料到資料庫
  scoreModel.create(formData, function (err, docs) {
    if (err) {
      console.log(err);
      res.render('InsertScore', { title: '新增樂譜', msg: 'alert("新增失敗")' });
    } else {
      console.log('儲存成功：', docs);
      // 刷新預載的資料
      scoreModel.find({}, { tags: 1, name: 1, author: 1 }, function (err, docs) {
        if (err) console.log(err);
        console.log(docs);
        preLoadScoreInfo = docs;
      });
      res.render('InsertScore', { title: '新增樂譜', msg: 'alert("新增成功")' });
    }
  });
});

module.exports = router;