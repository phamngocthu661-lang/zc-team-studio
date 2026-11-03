'use strict';

const {
  GLabsImageService,
  DEFAULT_GLABS_HOST,
  DEFAULT_GLABS_KEY,
  DEFAULT_GLABS_MODEL,
  DEFAULT_ASPECT_RATIO
} = require('./glabs-image-service');

const {
  CinematicVisualDirector,
  CINEMATIC_CAMERA_SHOTS,
  CINEMATIC_LIGHTING_PROFILES,
  PHOTOREALISM_SUFFIX
} = require('./cinematic-visual-director');

module.exports = {
  GLabsImageService,
  CinematicVisualDirector,
  DEFAULT_GLABS_HOST,
  DEFAULT_GLABS_KEY,
  DEFAULT_GLABS_MODEL,
  DEFAULT_ASPECT_RATIO,
  CINEMATIC_CAMERA_SHOTS,
  CINEMATIC_LIGHTING_PROFILES,
  PHOTOREALISM_SUFFIX
};
