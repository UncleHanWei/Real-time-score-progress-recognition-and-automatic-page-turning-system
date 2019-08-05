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
  name: String,
  author: String,
  intro: String,
  verse: {
    A: {
      lyric: String,
      chord: String
    },
    B: {
      lyric: String,
      chord: String
    }
  },
  pre: String,
  chorus: {
    A: {
      lyric: String,
      chord: String
    },
    B: {
      lyric: String,
      chord: String
    }
  },
  inter: {
    A: String,
    B: String,
    C: String
  },
  bridge: {
    lyric: String,
    chord: String
  },
  ending: {
    lyric: String,
    chord: String
  },
  outro: String,
  progress: String
});
var scoreModel = mongoose.model('scoreDB', scoreSchema);


// var doc = ({
//   tags: '林俊傑',
//   name: '修煉愛情'
// });

// // 新增資料到資料庫
// scoreModel.create(doc, function (err, docs) {
//   if (err) console.log(err);
//   console.log('儲存成功：', docs);
// });

var preLoadScoreInfo;
// 預先載入資料庫中樂譜的基本資訊(id 和 tags) 用以搜尋
scoreModel.find({}, { tags: 1, name: 1 }, function (err, docs) {
  if (err) console.log(err);
  console.log(docs);
  preLoadScoreInfo = docs;
});



router.post('/search_result', function (req, res, next) {
  console.log('This is preLoadScoreInfo====================>', preLoadScoreInfo);

  let formData = req.body['search'];
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

  res.render('search_result', { title: '搜尋結果', result: findResult });
});

// 接 我要更多資訊 的 request
router.post('/score', function (req, res, next) {
  
  let formData = req.body['scoreId'];
  console.log("這是新的 formData", formData);
  
  let score;
  scoreModel.find({ _id: formData }, { _id: 0 }, function (err, docs) {
    if (err) console.log(err);
    console.log('查詢結果：', docs);
    // 把搜尋出來的資料作整理
    score = docs[0];
    console.log(score.name);
    res.render('score', { title: score.name });
  });
});

module.exports = router;