var barCount = 0;

var sleep = (ms = 0) => {
  return new Promise(r => setTimeout(r, ms));
}

async function chordDetection() {
  barCount += 1;
  console.log(barCount);
  await sleep(1000);
  return;
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
        await chordDetection(allContent[i]);
        scoreDiv.html('');
        scoreDiv.append('<h4>' + score.progress[i] + '</h4>');
      }
      // 小節數小於 8 直接渲染和弦到頁面
      // 如果有歌詞就要分別渲染
      if(Array.isArray(allContent[i][bar])) {
        // allContent[i][bar][0] is Chord
        // allContent[i][bar][1] is Lyric
        scoreDiv.append(allContent[i][bar][0] + ' ');
      } else { // 沒有歌詞就直接渲染
        scoreDiv.append(allContent[i][bar] + ' ');
      }
    }
    // 不管有沒有超過 8 小節 進入下一個段落前都要 await 和弦分析
    await chordDetection(allContent[i]);
    scoreDiv.html('');

  }
}

// 將譜先做處理 做成一條陣列 印譜的時候用一個 for 跑就好
function dataPreProscess(score) {
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
  dataPreProscess(score);
  $('#startBtn').on('click', function() {
    dataPreProscess(score);
  })
}