/**
 * @fileoverview Description of this file.
 */

window.addEventListener('load', function(e) {
  var audioContext = new (window.audioContext || window.webkitAudioContext)();
  var sampler = new Visualizer(audioContext);
  window.addEventListener('keyup', function(e) {
    if (e.keyCode == 32 /* space bar */) {
      sampler.togglePlayback();
    }
  });
});

