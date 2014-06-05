/**
 * @fileoverview Description of this file.
 */

window.addEventListener('load', function() {
  var audioContext = new (window.audioContext || window.webkitAudioContext)();
  var sampler = new Visualizer(audioContext);
  document.querySelector('button').addEventListener('click', function() {
    sampler.togglePlayback();
  });
});
