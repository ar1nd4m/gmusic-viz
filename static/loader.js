/**
 * @fileoverview Loads a mp3 from a URL onto the Web Audio.
 *
 */

function BufferLoader(context, url, callback) {
  this.context = context;
  this.url = url;
  this.onload = callback;
  this.buffer = null;
  this.loadCount = 0;
}

BufferLoader.prototype.loadBuffer = function(url) {
  // Load in async.
  var request = new XMLHttpRequest();
  request.open("GET", url, true);
  request.responseType = "arraybuffer";

  var loader = this;
  request.onload = function() {
    loader.context.decodeAudioData(request.response, function(buffer) {
      loader.onDecode(url, buffer);
    },
    function(error) {
      console.error('decodeAudioData error:' + error);
    });
  };

  request.onerror = function() {
    console.error('BufferLoader: XHR error');
  }

  request.send();
};

BufferLoader.prototype.onDecode = function(url, buffer) {
  if (!buffer) {
    console.error('error decoding data file: ' + url);
    return;
  }
  this.onload(buffer);
};

BufferLoader.prototype.load = function() {
  this.loadBuffer(this.url);
};


function Visualizer(context) {
  this.buffer = null;
  this.bufferLoader = new BufferLoader(context, 'chrono.mp3',
                                       this.setBuffer.bind(this));
  this.bufferLoader.load();

  this.WIDTH = 640;
  this.HEIGHT = 360;
  this.SMOOTHING = 0.8;
  this.FFT_SIZE = 2048;

  this.context = context;
  this.analyser = this.context.createAnalyser();
  this.analyser.connect(context.destination);
  this.analyser.minDecibels = -140;
  this.analyser.maxDecibels = 0;

  this.freqs = new Uint8Array(this.analyser.frequencyBinCount);
  this.times = new Uint8Array(this.analyser.frequencyBinCount);

  this.isPlaying = false;
  this.startTime = 0;
  this.startOffset = 0;

  var canvas = document.querySelector('canvas');
  this.drawContext = canvas.getContext('2d');
  canvas.width = this.WIDTH;
  canvas.height = this.HEIGHT;
}

Visualizer.prototype.setBuffer = function(buffer) {
  this.buffer = buffer;
};

Visualizer.prototype.togglePlayback = function() {
  if (this.isPlaying) {
    this.source.stop(0);
    this.startOffset += this.context.currentTime - this.startTime;
    console.log('paused at: ', this.startOffset);
    this.isPlaying = false;
  } else if (this.buffer) {
    this.startTime = this.context.currentTime;
    console.log('started at: ', this.startOffset);
    this.source = this.context.createBufferSource();

    this.source.connect(this.analyser);
    this.source.buffer = this.buffer;
    this.source.loop = false; //true;

    // Bounded playback
    this.source.start(0, this.startOffset % this.buffer.duration);

    window.requestAnimationFrame(this.draw.bind(this));
    this.isPlaying = true;
  }
};

Visualizer.prototype.draw = function() {
  this.drawContext.clearRect(0, 0, this.WIDTH, this.HEIGHT);

  this.analyser.smoothingTimeConstant = this.SMOOTHING;
  this.analyser.fftSize = this.FFT_SIZE;

  this.analyser.getByteFrequencyData(this.freqs);
  this.analyser.getByteTimeDomainData(this.times);

  var width = Math.floor(1/this.freqs.length, 10);

  for (var i = 0; i < this.analyser.frequencyBinCount; i++) {
    var value = this.freqs[i];
    var percent = value / 256;
    var height = this.HEIGHT * percent;
    var yoffset = this.HEIGHT - height - 1;
    var barWidth = this.WIDTH / this.analyser.frequencyBinCount;
    var hue = i / this.analyser.frequencyBinCount * 360;

    this.drawContext.fillStyle = 'hsl(' + hue + ', 100%, 50%)';
    this.drawContext.fillRect(i * barWidth, yoffset, barWidth, height);
  }

  if (this.isPlaying) {
    window.requestAnimationFrame(this.draw.bind(this));
  }
};

