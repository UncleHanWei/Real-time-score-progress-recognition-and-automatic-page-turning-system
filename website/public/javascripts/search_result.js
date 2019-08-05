function setInputVal(id) {
  $('#toGetScore').val(id);
  $('#resultList').submit();
}

function _init(gotResult) {
  for (let i = 0; i < gotResult.length; i++) {
    let htmlStr = '<div class="row"><div class="col-md-4 btn btn-secondary" id="';
    htmlStr += gotResult[i]._id;
    htmlStr += '" onclick="setInputVal(id)">';
    htmlStr += gotResult[i].name;
    htmlStr += '</div></div>';
    $('#resultList').append(htmlStr);
  }
}