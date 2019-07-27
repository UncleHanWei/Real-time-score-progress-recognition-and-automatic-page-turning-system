var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Guitar' });
});
router.get('/Score', function(req, res, next) {
  res.render('Score', { title: '看是哪個譜' });
});
router.get('/testScore', function(req, res, next) {
  res.render('testScore', { title: '測試顯示譜' });
});
router.get('/pitchDetecter', function(req, res, next) {
  res.render('pitchDetecter', { title: 'Guitar' });
});
router.get('/chordDetecter', function(req, res, next) {
  res.render('chordDetecter', { title: 'Chord Detecer' });
});

module.exports = router;
