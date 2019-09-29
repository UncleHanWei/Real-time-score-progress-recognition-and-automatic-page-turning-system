// 可能是處裡不同瀏覽器的支援狀況
window.AudioContext = window.AudioContext || window.webkitAudioContext;
// 宣告全域的變數
var audioContext = null; // 用來建立音訊事件的物件
var analyser = null; // 之後要用來取得 分析音頻 的方法
var theBuffer = null; // 不確定用途
var mediaStreamSource = null; // 用來取得音訊串流
var isConnect = false;
var chordSound = Array();
var nowChord; // 紀錄當前使用者所彈的和弦
var globalScore;

function findChord(chordSound) {
  let eleQuantity = {};
  // 去除重複的值
  reducedArr = chordSound.filter(function (element, index, arr) {
    return arr.indexOf(element) === index;
  });
  console.log("reduced", reducedArr);
  let sum = 0;
  // 計算陣列中各值的出現次數
  for (let i = 0; i < reducedArr.length; i++) {
    let count = 0;
    for (let j = 0; j < chordSound.length; j++) {
      if (chordSound[j] == reducedArr[i]) {
        count += 1;
      }
    }
    eleQuantity[reducedArr[i]] = count;
    sum += count;
  }

  let resultArr = Array();
  let keys = Object.keys(eleQuantity);
  // 計算所有元素出現次數的平均
  let avg = Math.round(sum / keys.length);
  // 只取出現率大於平均的音
  for (let i = 0; i < keys.length; i++) {
    if (eleQuantity[keys[i]] >= avg) {
      resultArr.push(keys[i]);
    }
  }
  nowChord = resultArr;
  // // 調出和弦表的 key
  // let chordTableKeys = Object.keys(chordTable);
  // for (let i = 0; i < chordTableKeys.length; i++) {
  //   let countNote = 0;
  //   for(let j = 0; j < chordTable[chordTableKeys[i]].length; j++) {
  //     if(resultArr.includes(chordTable[chordTableKeys[i]][j])) {
  //       countNote += 1;
  //     }
  //   }
  //   if(countNote == chordTable[chordTableKeys[i]].length) {
  //     return i;
  //   }
  // }
  return nowChord;
}

var rafID = null;
var tracks = null;
var buflen = 4096;
var buf = new Float32Array(buflen);
var freqBuf = new Float32Array(buflen);

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
  //	var best_frequency = sampleRate/best_offset;
}

function updatePitch(time) {
  analyser.getFloatTimeDomainData(buf);
  // 會把 buf 這個陣列拿去做自相關函數 用以求出訊號頻率
  // buf 內容是 4096 個訊號的數字 相當於之前用 CHUNK 去得出的訊號陣列
  // audioContext.sampleRate = 48000
  var freq = autoCorrelate(buf, audioContext.sampleRate);
  if (freq == -1) {
    chordSound.length = 0;
  } else {
    pitch = freq;
    // 呼叫函數把頻率轉成音階
    // 建立一個全域的陣列可能 length = 100
    // 用來暫存每次收音得到的音
    // 從前 100 個來判斷和弦組成音
    var note = noteFromPitch(pitch);
    if (chordSound.length < 10) {
      chordSound.push(noteStrings[note % 12]);
    } else {
      let resultchord;
      // 檢查陣列裡的聲音符合哪個和弦
      resultchord = findChord(chordSound);
      console.log('resultchord', resultchord);

      // 洗掉陣列裡的內容
      chordSound.length = 0;
    }
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame(updatePitch);
}

function _getUserMedia() {
  try {
    // 取得使用者的媒體裝置(麥克風)
    // get 完回傳的是一個 mediaStream 的 promise (promise 是幹嘛的?)
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
        if (isConnect) {
          updatePitch();
        }
      })
      .catch(function (err) {
        alert(err);
      });
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }
}

// 開啟演奏模式 (監聽 onclick)
function liveMod() {
  if (audioContext == null) {
    audioContext = new AudioContext();
    // 需要取得使用者的麥克風進行音訊串流
    // getUserMedia 之後似乎會 return 一個 stream
    // 呼叫 getUserMedia 的函數, callback 到 getStream 函數
    _getUserMedia();
    isConnect = true;
  } else {
    mediaStreamSource.connect(analyser);
    isConnect = true;
  }
}

function stopStream() {
  mediaStreamSource.disconnect();
  isConnect = false;
}


var barCount = 0;

var sleep = (ms = 0) => {
  return new Promise(r => setTimeout(r, ms));
}

// function comapre(chord_on_score) {
//   while (!nowChord.includes(chord_on_score))
//     ;
//   return true;
// }

async function chordDetection(paragraph, chord_on_score) {
  while(!Array.isArray(nowChord)) {
    ;
  }
  barCount += 1;
  console.log('paragraph ====> ', paragraph);
  // paragraph 要判斷是否有歌詞(二維)
  // 沒有的話可以直接 for
  // 有的話要取 [i][0] 即和弦的部分
  console.log(barCount);
  // await sleep(10000);
  if (Array.isArray(paragraph[0])) {
    // 把段落裡的每個和弦傳去比對使用者輸入
    for (let i = 0; i < paragraph.length; i++) {
      // if 和弦對 return
      // else 繼續等待和弦辨識
      console.log('erngfsgnwsnfwe');
      while (!nowChord.includes(paragraph[i][0])) {
        ;
      }
      // 偵測過的和弦要把 CSS 的顏色做更改
      $('#' + i).addClass('played');
    }
    return true;
  } else {
    // 把段落裡的每個和弦傳去比對使用者輸入
    for (let i = 0; i < paragraph.length; i++) {
      // if 和弦對 return
      // else 繼續等待和弦辨識
      while (!nowChord.includes(paragraph[i])) {
        ;
      }
      // 偵測過的和弦要把 CSS 的顏色做更改
      $('#' + i).addClass('played');
    }
    return true;
  }
  // return;
}


async function writeScore(score, allContent) {
  let scoreDiv = $('#scoreDiv');
  // 每次只處理一個段落
  // 每次最多只顯示 8 小節
  // allContent[i] : 每個段落(Ex: Intro, verse...etc)
  // allContent[i][bar] : 每個段落裡的各小節
  for (let i = 0; i < allContent.length; i++) {
    scoreDiv.append('<h4>' + score.progress[i] + '</h4>');

    // 渲染頁面, 一次吐 8 小節, 如果吐到 8 小節就先 await 和弦判斷
    // 等到和弦判斷使用者已經彈到第 8 小節, 再重新渲染下一個部分
    // 每次都要先洗掉現有的譜
    for (let bar = 0; bar < allContent[i].length; bar++) {
      if (bar != 0 && bar % 8 == 0) { // 小節數超過 8
        // await chordDetection(allContent[i]);
        await sleep(1000);
        scoreDiv.html('');
        scoreDiv.append('<h4>' + score.progress[i] + '</h4>');
      }
      // 小節數小於 8 直接渲染和弦到頁面
      // 如果有歌詞就要分別渲染
      if (Array.isArray(allContent[i][bar])) {
        // allContent[i][bar][0] is Chord
        // allContent[i][bar][1] is Lyric
        scoreDiv.append('<span id="' + i + '">' + allContent[i][bar][0] + ' </span><br>');
        scoreDiv.append('<span>' + allContent[i][bar][1] + ' </span><br>');
      } else { // 沒有歌詞就直接渲染
        scoreDiv.append('<span id="' + i + '">' + allContent[i][bar] + ' </span>');
      }
    }
    // 不管有沒有超過 8 小節 進入下一個段落前都要 await 和弦分析
    // await chordDetection(allContent[i]);
    await sleep(1000);
    scoreDiv.html('');

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
  console.log(allContent);
  writeScore(score, allContent);
}

function _init(score) {
  console.log(score);
  $('#infoBar').append('<div class="col-md-1"> Capo: ' + score.capo + '</div>');
  $('#infoBar').append('<div class="col-md-1"> Key: ' + score.key + '</div>');
  $('#infoBar').append('<div class="col-md-1"> Play: ' + score.play + '</div>');
  $('#infoBar').append('<div class="col-md-1"><button id="startBtn" class="btn btn-primary">START</div</div>');
  // 要加 button 讓使用者開始或關閉監測演奏模式(關閉其實好像也不一定)
  // dataPreProcess(score);
  globalScore = score;
  $('#startBtn').on('click', function () {
    liveMod();
    dataPreProcess(score);
  })
}