// 可能是處裡不同瀏覽器的支援狀況
window.AudioContext = window.AudioContext || window.webkitAudioContext;
// 宣告全域的變數
var audioContext = null; // 用來建立音訊事件的物件
var analyser = null; // 之後要用來取得 分析音頻 的方法
var mediaStreamSource = null; // 用來取得音訊串流
var tracks = null;
var isStart = false;

var g_score;
var g_allContent;
var soundData = Array();
var paragraph;
var paraIndex = 0;

var finishParagraph = new Event('finishParagraph');

function userProgress() { // 用來標色顯示使用者彈到的和弦
  console.log('now index', paraIndex);

  // 使用的參數是全域的 paragraph, 即是當前頁面上所顯示的樂譜段落
  // 使用全域的變數 paraIndex 來控制標色的進度
  // if 有歌詞 則 和弦為 data[i][0] else data[i]
  if (Array.isArray(paragraph[0])) { // 有歌詞
    console.log('isArray');
    // 每個和弦跟 全域的 soundData 做比對
    // if 和弦 in soundData 
    if (soundData.includes(paragraph[paraIndex][0].charAt(0))) {
      // 標色
      $('#' + paraIndex).addClass('played');
      paraIndex += 1
    }
  } else {
    console.log('not Array');
    if (soundData.includes(paragraph[paraIndex].charAt(0))) {
      // 標色
      $('#' + paraIndex).addClass('played');
      paraIndex += 1
    }
  }
  soundData.length = 0;
  if (paraIndex == paragraph.length) {
    // 觸發事件
    // 該事件 resolve writeScore 裡的 await Promise
    window.dispatchEvent(finishParagraph);
    paraIndex = 0;
  }
}

async function writeScore() {
  let scoreDiv = $('#scoreDiv');
  // 每次只處理一個段落
  // 每次最多只顯示 8 小節
  // allContent[i] : 每個段落(Ex: Intro, verse...etc)
  // allContent[i][bar] : 每個段落裡的各小節
  for (let i = 0; i < g_allContent.length; i++) {
    scoreDiv.append('<h4>' + g_score.progress[i] + '</h4>');
    // 渲染頁面, 一次吐 8 小節, 如果吐到 8 小節就先 await 和弦判斷
    // 等到和弦判斷使用者已經彈到第 8 小節, 再重新渲染下一個部分
    // 每次都要先洗掉現有的譜
    // 用全域的變數 paragraph 儲存每次要去 userProgress 做判斷的段落
    // 每回合會被覆蓋
    paragraph = g_allContent[i];
    for (let bar = 0; bar < g_allContent[i].length; bar++) {
      if (bar != 0 && bar % 8 == 0) { // 小節數超過 8
        paragraph = g_allContent[i];
        paraIndex = 8;
        soundData.length = 0;
        // Promise 裡面綁定一個事件，用這裡面的事件觸發 resolve(?
        // 綁定的事件是 "userProgress 完成一次段落"
        await new Promise(async (rs, rj) => {
          window.addEventListener('finishParagraph', async e => {
            rs();
          });
        });
        // await sleep(1000);
        scoreDiv.html('');
        scoreDiv.append('<h4>' + g_score.progress[i] + '</h4>');
      }
      // 小節數小於 8 直接渲染和弦到頁面
      // 如果有歌詞就要分別渲染
      if (Array.isArray(g_allContent[i][bar])) {
        // allContent[i][bar][0] is Chord
        // allContent[i][bar][1] is Lyric
        scoreDiv.append('<span id="' + bar + '">' + g_allContent[i][bar][0] + ' </span><br>');
        scoreDiv.append('<span>' + g_allContent[i][bar][1] + ' </span><br>');
      } else { // 沒有歌詞就直接渲染
        scoreDiv.append('<span id="' + bar + '">' + g_allContent[i][bar] + ' </span>');
      }
    }
    // 不管有沒有超過 8 小節 進入下一個段落前都要 await 和弦分析
    await new Promise(async (rs, rj) => {
      window.addEventListener('finishParagraph', async e => {
        rs();
      });
    });
    await sleep(1000);
    scoreDiv.html('');
  }
}

var rafID = null;
var tracks = null;
var buflen = 4096;
var buf = new Float32Array(buflen);

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch(frequency) {
  var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.
var GOOD_ENOUGH_CORRELATION = 0.9; // this is the "bar" for how close a correlation needs to be

// 自相關函數
function autoCorrelate(buf, sampleRate) {
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE / 2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);

  for (var i = 0; i < SIZE; i++) {
    var val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  // console.log('rms:', rms);
  if (rms < 0.08) // not enough signal
    return -1;

  var lastCorrelation = 1;
  for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i]) - (buf[i + offset]));
    }
    correlation = 1 - (correlation / MAX_SAMPLES);
    correlations[offset] = correlation; // store it, for the tweaking we need to do below.
    if ((correlation > GOOD_ENOUGH_CORRELATION) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
      // Now we need to tweak the offset - by interpolating between the values to the left and right of the
      // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
      // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
      // (anti-aliased) offset.

      // we know best_offset >=1, 
      // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
      // we can't drop into this clause until the following pass (else if).
      var shift = (correlations[best_offset + 1] - correlations[best_offset - 1]) / correlations[best_offset];
      return sampleRate / (best_offset + (8 * shift));
    }
    lastCorrelation = correlation;
  }
  if (best_correlation > 0.01) {
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
    return sampleRate / best_offset;
  }
  return -1;
}

window.addEventListener('gotEnoughSound', () => {
  console.log('Go progress');
  userProgress();
})

var gotEnoughSound = new Event('gotEnoughSound')

function getSoundData() {
  // 先取得使用者彈的聲音的頻率
  analyser.getFloatTimeDomainData(buf);
  var freq = autoCorrelate(buf, audioContext.sampleRate);
  // soundData 必須是全域的變數不然會被重置
  if (freq == -1) {
    soundData.length = 0;
  } else {
    // 呼叫函數把頻率轉成音階
    var note = noteFromPitch(freq);
    if (soundData.length < 10) {
      // soundData.push(note) till length == 10
      // 減掉 capo 的數字來處理調性問題
      let capo = parseInt(g_score.capo);
      console.log(capo);
      soundData.push(noteStrings[(note - capo) % 12]);
    } else { // else length == 10
      console.log(soundData);
      // 觸發事件
      // 觸發後要做的事 => userProgress
      window.dispatchEvent(gotEnoughSound);
      // 洗掉陣列裡的內容
      soundData.length = 0;
    }
  }
  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame(getSoundData);
}

function myGetUserMedia() {
  try {
    // 取得使用者的媒體裝置(麥克風)
    // get 完回傳一個 mediaStream 的 promise
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function (stream) {
        console.log('start stream');
        // Create an AudioNode from the stream.
        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        tracks = stream.getTracks();
        // Connect it to the destination.
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096;
        mediaStreamSource.connect(analyser);
        getSoundData();
      })
      .catch(function (err) {
        alert(err);
      });
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }
}

function startLive() {
  if (audioContext == null) {
    // audioContext = new AudioContext();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // 需要取得使用者的麥克風進行音訊串流
    // getUserMedia 之後似乎會 return 一個 stream
    // 呼叫 getUserMedia 的函數, callback 到 getStream 函數
    myGetUserMedia();
  }
}

// 將譜先做處理 做成一條陣列 印譜的時候用一個 for 跑就好
function dataPreProcess(score) {
  var allContent = Array();
  for (let i = 0; i < score.progress.length; i++) {
    // 檢查該段落是否有歌詞和和弦
    if (Object.keys(eval('score.' + score.progress[i])).includes('chord')) {
      // 建立用來存放 chord 跟 lyric 的陣列(一共 2 格)
      let cNL = Array();
      for (let bar = 0; bar < eval('score.' + score.progress[i] + '.chord').length; bar++) {
        let tmpChord = eval('score.' + score.progress[i] + '.chord')[bar];
        let tmplyric = eval('score.' + score.progress[i] + '.lyric')[bar];
        cNL.push([tmpChord, tmplyric]);
      }
      // 把 cNL 放進 allContent 會形成 3 維的陣列
      allContent.push(cNL)
    } else {
      allContent.push(eval('score.' + score.progress[i]));
    }
  }
  return allContent;
}

// 建立 init 函數
function _init(score) {
  // 用來印出樂譜的幾個基本資料
  $('#infoBar').append('<div class="col-md-1"> Capo: ' + score.capo + '</div>');
  $('#infoBar').append('<div class="col-md-1"> Key: ' + score.key + '</div>');
  $('#infoBar').append('<div class="col-md-1"> Play: ' + score.play + '</div>');
  $('#infoBar').append('<div class="col-md-1"><button id="startBtn" class="btn btn-primary">START</div</div>');
  $('#infoBar').append('<div class="col-md-1"><button id="stopBtn" class="btn btn-primary">STOP</div</div>');
  $('#u2Video').attr('src', 'https://www.youtube.com/embed/' + score.youtube);
  // 存入全域的 score 跟 allContent
  g_score = score;
  g_allContent = dataPreProcess(score);
  // 並把 START button 加上 onclick
  $('#startBtn').on('click', function () {
    // 用來確定當前的譜的狀況
    if (isStart) {
    } else {
      // onclick 裡面呼叫 startLive
      // 啟動音訊串流
      startLive();
      // 寫譜
      writeScore();
      isStart = true;
    }
  });
  $('#stopBtn').on('click', function () {
    mediaStreamSource.disconnect();
    tracks.forEach(function (track) {
      console.log('Stream Stopped');
      track.stop();
    });
    isStart = false;
    audioContext = null;
    paraIndex = 0;
    window.cancelAnimationFrame(rafID);
    $('#scoreDiv').html('');
  })
}