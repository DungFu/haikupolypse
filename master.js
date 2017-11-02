var player = null;
var videos = [];
var videoIndex = 0;
var isPlayerReady = false;
var lastFetchedName = null;

var titleElem = document.getElementById("title");
var sortTypeElem = document.getElementById("sortType");

var sortType = localStorage.getItem('sortType');
if (sortType === null) {
  sortType = 'month';
}
sortTypeElem.value = sortType;

sortTypeElem.addEventListener("change", function() {
  sortType = sortTypeElem.value;
  localStorage.setItem('sortType', sortType);
  if (isPlayerReady) {
    videos = [];
    videoIndex = 0;
    lastFetchedName = null;
    fetchMoreVideos();
  }
});

var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api"; 
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function launchIntoFullscreen(element) {
  if(element.requestFullscreen) {
    element.requestFullscreen();
  } else if(element.mozRequestFullScreen) {
    element.mozRequestFullScreen();
  } else if(element.webkitRequestFullscreen) {
    element.webkitRequestFullscreen();
  } else if(element.msRequestFullscreen) {
    element.msRequestFullscreen();
  }
}

function exitFromFullscreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen();
  } else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen();
  } else if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen();
  }
}

document.onkeydown = function(e) {
  if (isPlayerReady && !e.repeat) {
    switch (e.keyCode) {
      case 32: // spacebar
        if (player.getPlayerState() === YT.PlayerState.PAUSED) {
          player.playVideo();
        } else if (player.getPlayerState() === YT.PlayerState.PLAYING) {
          player.pauseVideo();
        }
        break;
      case 37: // left
        playPrevVideo();
        break;
      case 39: // right
        playNextVideo();
        break;
      case 70: // f
        if (document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen) {
          exitFromFullscreen();
        } else {
          launchIntoFullscreen(player.getIframe());
        }
        break;
    }
  }
};

window.addEventListener("resize", function() {
  if (isPlayerReady) {
    var size = getSize();
    player.setSize(size[0], size[1]);
  }
});

function getSize() {
  var vheight = window.innerHeight * 0.75;
  var vwidth = vheight * (16/9);
  var wwidth = window.innerWidth * 0.75;
  var wheight = wwidth * (9/16);
  if (vheight < wheight) {
    return [vwidth, vheight];
  } else {
    var tempHeight = Math.min(vheight, window.innerWidth * (9/16));
    return [tempHeight * (16/9), tempHeight];
  }
}

function onYouTubeIframeAPIReady() {
  var size = getSize();
  player = new YT.Player('player', {
    height: size[1],
    width: size[0],
    playerVars: { 'autoplay': 1 },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
}

function onPlayerReady(event) {
  isPlayerReady = true;
  fetchMoreVideos();
}

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.ENDED) {
    playNextVideo();
  }
}

function onPlayerError(event) {
  playNextVideo();
}

function fetchMoreVideos() {
  var url = 'https://www.reddit.com/r/youtubehaiku/';
  var dividerChar;
  if (sortType === 'hot') {
    url += 'hot.json';
    dividerChar = '?';
  } else if (sortType === 'new') {
    url += 'new.json';
    dividerChar = '?';
  } else {
    url += 'top.json?sort=top&t=' + sortType;
    dividerChar = '&';
  }
  if (lastFetchedName !== null) {
    url += dividerChar + 'after=' + lastFetchedName;
  }
  fetch(url).then(function(response) {
    return response.json();
  }).then(function(jsonData) {
    var startVideoNum = videos.length;
    var shouldPlayVideo = videos.length === 0 || videoIndex >= videos.length;
    for (var i = 0; i < jsonData.data.children.length; i++) {
      var data = jsonData.data.children[i].data;
      var id = data.id;
      var url = data.url;
      var urlParams = parseUrlParams(url);
      var youtubeId = null;
      if (data.domain === 'youtu.be') {
        youtubeId = url.split('youtu.be/')[1].split('?')[0];
      } else if (data.domain === 'youtube.com') {
        if (urlParams.v !== undefined) {
          youtubeId = urlParams.v;
        } else {
          var youtubeUrls = ["youtube.com/v/", 'youtube.com/embed/'];
          for (var urlIndex = 0; i < youtubeUrls.length; i++) {
            if (url.includes(youtubeUrls[urlIndex])) {
              youtubeId = url.split(youtubeUrls[urlIndex])[1].split('?')[0];
            }
          }
        }
      }
      if (youtubeId !== null && !localStorage.getItem(id) && !localStorage.getItem(youtubeId)) {
        videos.push({
          id: id,
          permalink: data.permalink,
          score: data.score,
          title: data.title,
          url: url,
          youtubeId: youtubeId
        });
      }
      if (i === jsonData.data.children.length - 1) {
        lastFetchedName = data.name;
      }
    }
    if (shouldPlayVideo && videoIndex < videos.length) {
      playVideoObj(videos[videoIndex]);
    }
    if (startVideoNum === videos.length) {
      fetchMoreVideos();
    }
  });
}

function playNextVideo() {
  videoIndex++;
  if (videoIndex + 5 > videos.length) {
    fetchMoreVideos();
  }
  if (videoIndex < videos.length) {
    playVideoObj(videos[videoIndex]);
  }
}

function playPrevVideo() {
  if (videoIndex > 0) {
    videoIndex--;
    if (videoIndex < videos.length) {
      playVideoObj(videos[videoIndex]);
    }
  }
}

function playVideoObj(video) {
  titleElem.innerHTML = video.title + " &middot; " + video.score + " points";
  titleElem.href = 'https://www.reddit.com' + video.permalink;
  localStorage.setItem(video.id, true);
  localStorage.setItem(video.youtubeId, true);
  var urlParams = parseUrlParams(video.url);
  var startTime = 0;
  if (urlParams.t !== undefined) {
    startTime = urlParams.t;
  } else if (urlParams.start != undefined) {
    startTime = urlParams.start;
  }
  player.loadVideoById(video.youtubeId, startTime, 'default');
  player.playVideo();
}

function parseUrlParams(url) {
  var params = {};
  var baseSplit = url.split('?');
  if (baseSplit.length > 1) {
    var params = baseSplit[1].split('&');
    for (var i = 0; i < params.length; i++) {
      var paramVals = params[i].split('=');
      if (paramVals.length > 1) {
        params[paramVals[0]] = paramVals[1];
      } else {
        params[paramVals[0]] = true;
      }
    }
  }
  return params;
}
