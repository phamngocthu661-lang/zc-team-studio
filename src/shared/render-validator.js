'use strict';

function asByteBuffer(buffer, label) {
  if (buffer instanceof Uint8Array) return buffer;
  if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
  throw new TypeError(`${label} must be an ArrayBuffer or typed array`);
}

function compareRgbaBuffers(actual, expected, options = {}) {
  const width = Number(options.width);
  const height = Number(options.height);
  if (!Number.isInteger(width) || width <= 0) throw new TypeError('width must be a positive integer');
  if (!Number.isInteger(height) || height <= 0) throw new TypeError('height must be a positive integer');
  const tolerance = Math.max(0, Number(options.tolerance ?? 0));
  const actualBytes = asByteBuffer(actual, 'actual');
  const expectedBytes = asByteBuffer(expected, 'expected');
  const requiredLength = width * height * 4;
  if (actualBytes.byteLength < requiredLength) throw new RangeError(`actual buffer is smaller than ${requiredLength} RGBA bytes`);
  if (expectedBytes.byteLength < requiredLength) throw new RangeError(`expected buffer is smaller than ${requiredLength} RGBA bytes`);

  let differentPixelCount = 0;
  let maxChannelDifference = 0;
  let absoluteDifferenceSum = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    let pixelDifferent = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(actualBytes[offset + channel] - expectedBytes[offset + channel]);
      absoluteDifferenceSum += delta;
      if (delta > maxChannelDifference) maxChannelDifference = delta;
      if (delta > tolerance) pixelDifferent = true;
    }
    if (pixelDifferent) {
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      differentPixelCount += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  const totalPixels = width * height;
  return {
    width,
    height,
    tolerance,
    differentPixelCount,
    differentPixelPercent: differentPixelCount / totalPixels * 100,
    maxChannelDifference,
    meanAbsoluteDifference: absoluteDifferenceSum / (totalPixels * 4),
    boundingBoxOfDifference: differentPixelCount > 0
      ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
      : null
  };
}

module.exports = { compareRgbaBuffers };
