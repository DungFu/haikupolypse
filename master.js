var player = null;
var videos = [];
var videoIndex = 0;
var isPlayerReady = false;
var lastFetchedName = null;
var youtubeUrl = "https://www.youtube.com/watch?v=";
var currentStatus;

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
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  isPlayerReady = true;
  fetchMoreVideos();
}

function onPlayerStateChange(event) {
  currentStatus = event.data;
  if (event.data == YT.PlayerState.ENDED) {
    playNextVideo();
  } else if (event.data === YT.PlayerState.UNSTARTED) {
    setTimeout(function() {
      if (currentStatus === YT.PlayerState.UNSTARTED) {
        playNextVideo();
      }
    }, 500);
  }
}

function fetchMoreVideos() {
  var url = 'https://www.reddit.com/r/youtubehaiku/top.json?sort=top&t=' + sortType;
  if (lastFetchedName !== null) {
    url += '&after=' + lastFetchedName;
  }
  fetch(url).then(function(response) {
    return response.json();
  }).then(function(jsonData) {
    var startVideoNum = videos.length;
    var shouldPlayVideo = videos.length === 0 || videoIndex >= videos.length;
    for (var i = 0; i < jsonData.data.children.length; i++) {
      var data = jsonData.data.children[i].data;
      var url = data.url;
      var name = data.name;
      if (url.includes(youtubeUrl) && localStorage.getItem(name) === null) {
        videos.push({
          id: url.split(youtubeUrl)[1].split('&')[0],
          name: name,
          title: data.title,
          score: data.score
        });
      }
      if (i === jsonData.data.children.length - 1) {
        lastFetchedName = name;
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
  localStorage.setItem(video.name, video.id);
  player.loadVideoById(video.id, 0, 'default');
}