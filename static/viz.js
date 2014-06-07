/**
 * @fileoverview AudioPlayer.
 */

function AudioPlayer(context, vizCallback) {
  this.context = context;
  this.vizCallback = vizCallback;

  this.audioElement = document.querySelector('audio');
  this.audioElement.addEventListener('canplaythrough', this.onLoaded.bind(this));
  this.audioElement.addEventListener('playing', this.queueNextFrame.bind(this));
  this.audioElement.addEventListener('stalled', this.showLoading.bind(this));
  this.audioElement.controls = false;
  this.audioElement.loop = false;
}

AudioPlayer.prototype.load = function(url) {
  this.audioElement.src = url;
  this.audioElement.load();

  this.showLoading();
};

AudioPlayer.prototype.onLoaded = function() {
  // Build the pipeline.
  this.analyser = this.context.createAnalyser();
  this.analyser.connect(this.context.destination);

  this.source = this.context.createMediaElementSource(this.audioElement);
  this.source.connect(this.analyser);

  this.analyser.fftSize = 2048;
  this.analyser.smoothingTimeConstant = 0.8;

  this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
  this.timeData = new Uint8Array(this.analyser.frequencyBinCount);
  this.vizCallback(this.analyser.frequencyBinCount,
                   this.freqData, this.timeData);

  this.audioElement.play();
};

AudioPlayer.prototype.showLoading = function() {
  document.querySelector('#spinner').classList.remove('hidden');
}

AudioPlayer.prototype.queueNextFrame = function() {
  document.querySelector('#spinner').classList.add('hidden');
  if (!!this.audioElement && !this.audioElement.paused) {
    window.requestAnimationFrame(this.frameCallback.bind(this));
  }
}

AudioPlayer.prototype.frameCallback = function() {
  this.queueNextFrame();

  // Copy the time and frequency data and pass it along.
  this.analyser.getByteFrequencyData(this.freqData);
  this.analyser.getByteTimeDomainData(this.timeData);

  this.vizCallback(this.analyser.frequencyBinCount,
                   this.freqData, this.timeData);
};

AudioPlayer.prototype.togglePause = function() {
  if (!this.audioElement.src) {
    this.load('chrono.mp3');
  } else if (!this.audioElement.paused) {
    this.audioElement.pause();
  } else if (!this.audioElement.ended) {
    this.audioElement.play();
  }
};

function Visualizer() {
  this.canvas = document.querySelector('canvas');
  this.drawContext = this.canvas.getContext('2d');

  this.canvas.addEventListener('resize', this.resetCanvasSize.bind(this));
  this.resetCanvasSize();
}

Visualizer.prototype.resetCanvasSize = function() {
  this.canvas.height = this.canvas.offsetHeight;
  this.canvas.width = this.canvas.offsetWidth;
};

Visualizer.prototype.draw = function(freqBinCount, freqs, times) {
  this.drawContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  for (var i = 0; i < freqBinCount; i++) {
    var value = freqs[i];
    var percent = value / 256;
    var barHeight = this.canvas.height * percent;
    var yoffset = this.canvas.height - barHeight - 1;
    var barWidth = this.canvas.width / freqBinCount;
    var hue = i / freqBinCount * 360;

    this.drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    this.drawContext.fillRect(i * barWidth, yoffset, barWidth, barHeight);
  }
};

window.addEventListener('load', function(e) {
  var audioContext = new (window.audioContext || window.webkitAudioContext)();
  var viz = new Visualizer();
  var player = new AudioPlayer(audioContext, viz.draw.bind(viz));

  var receiver = cast.receiver.CastReceiverManager.getInstance();
  var messageBus = receiver.getCastMessageBus('urn:x-cast:gmusic.viz.attempts');
  messageBus.onMessage = function(e) {
    console.log("Message type: " + e.type + " from: " + e.senderId + " data: " + e.data);
    player.togglePause();
  };
  receiver.start();

  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 32 /* space bar */) {
      player.togglePause();
    }
  });
  
  player.togglePause();
});

