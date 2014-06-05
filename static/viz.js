/**
 * @fileoverview Description of this file.
 */

enum AudioPlayerState {
  UNSTARTED: 0,
  LOADING: 1,
  PLAYING: 2,
  PAUSED: 3,
  FINISHED: 4,
}

function AudioPlayer(context) {
  this.state = AudioPlayerState.UNSTARTED;
  this.context = context;
}

AudioPlayer.prototype.load(url, vizCallback) {
  this.audioElement = document.querySelector('audio');
  this.audioElement.addEventListener("canplay", this.onLoaded.bind(this));
  this.audioElement.src = url;
  this.vizCallback = vizCallback;
  this.startOffset = 0;
  this.startTime = 0;

  this.state = LOADING;
};

AudioPlayer.prototype.reSource = function() {
  this.source = this.context.createMediaElementSource(this.audioElement);
  this.source.connect(this.analyser);
  this.source.loop = false;
  this.source.start(0, this.startOffset % this.buffer.duration);
}

AudioPlayer.prototype.onLoaded = function() {
  // Build the pipeline.
  this.analyser = this.context.createAnalyser();
  this.analyser.connect(this.context.destination);
  this.reSource();

  this.analyser.fftSize = 2048;
  this.analyser.smoothingTimeConstant = 0.8;

  this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
  this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
  this.vizCallback(this.analyser.frequencyBinCount, this.freqData, this.timeData);

  this.state = PLAYING;
  window.requestAnimationFrame(this.frameCallback.bind(this));
};

AudioPlayer.prototype.frameCallback = function() {
  if (this.state == AudioPlayerState.PLAYING) {
    window.requestAnimationFrame(this.frameCallback.bind(this));
  }

  // Copy the time and frequency data and pass it along.
  this.analyser.getByteFrequencyData(this.freqData);
  this.analyser.getByteTimeDomainData(this.timeData);

  this.vizCallback(this.analyser.frequencyBinCount, this.freqData, this.timeData);
};

AudioPlayer.prototype.togglePause = function() {
  if (this.state == AudioPlayerState.PLAYING) {
    this.source.stop(0);
    this.startOffset += this.context.currentTime - this.startTime;
    this.state = AudioPlayerState.PAUSED;
  } else if (this.state == AudioPlayerState.PAUSED) {
    this.startTime = this.startOffset;
    this.reSource();
  }
};

function Visualizer() {
  this.canvas = document.querySelector('canvas');
  this.height = this.canvas.offsetHeight;
  this.width = this.canvas.offsetWidth;
  this.drawContext = this.canvas.getContext('2d');
}

Visualizer.prototype.draw = function(freqBinCount, freqs, times) {
  var width = Math.floor(1/freqs.length, 10);

  this.drawContext.clearRect(0, 0, this.width, this.height);
  for (var i = 0; i < freqBinCount; i++) {
    var value = freqs[i];
    var percent = value / 256;
    var height = this.height * percent;
    var yoffset = this.height - height - 1;
    var barWidth = this.width / freqBinCount;
    var hue = i / freqBinCount * 360;

    this.drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    this.drawContext.fillRect(i * barWidth, yoffset, barWidth, height);
  }
}

window.addEventListener('load', function(e) {
  var audioContext = new (window.audioContext || window.webkitAudioContext)();
  var sampler = new Visualizer(audioContext);
  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 32 /* space bar */) {
      sampler.togglePlayback();
    }
  });
});

