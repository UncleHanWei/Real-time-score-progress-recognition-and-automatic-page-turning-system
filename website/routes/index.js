var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Guitar' });
});
router.get('/pitchDetecter', function (req, res, next) {
  res.render('pitchDetecter', { title: 'Guitar' });
});
router.get('/chordDetecter', function (req, res, next) {
  res.render('chordDetecter', { title: 'Chord Detecer' });
});
router.get('/InsertScore', function (req, res, next) {
  res.render('InsertScore', { title: '新增樂譜', msg: '' });
})
module.exports = router;
