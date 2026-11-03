const SOURCE_WIDTH = 4096;
const SOURCE_HEIGHT = 2160;
const WIDTH = 1024;
const HEIGHT = 540;

function report(value, title, detail) {
  self.postMessage({ type: "progress", value, title, detail });
}

function clamp(value, minimum = 0, maximum = 255) {
  return Math.min(maximum, Math.max(minimum, value));
}

function downsampleBayer(source) {
  const output = new Uint8Array(WIDTH * HEIGHT);

  for (let y = 0; y < HEIGHT; y += 1) {
    const sourceY = Math.floor(y / 2) * 8 + (y % 2);
    const outputRow = y * WIDTH;

    for (let x = 0; x < WIDTH; x += 1) {
      const sourceX = Math.floor(x / 2) * 8 + (x % 2);
      let sum = 0;
      for (let sampleY = 0; sampleY < 4; sampleY += 1) {
        const row = (sourceY + sampleY * 2) * SOURCE_WIDTH;
        for (let sampleX = 0; sampleX < 4; sampleX += 1) {
          sum += source[row + sourceX + sampleX * 2];
        }
      }
      output[outputRow + x] = Math.round(sum / 16);
    }
  }

  return output;
}

function rawPreview(bayer) {
  const output = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let index = 0; index < bayer.length; index += 1) {
    const value = bayer[index];
    const target = index * 4;
    output[target] = value;
    output[target + 1] = value;
    output[target + 2] = value;
    output[target + 3] = 255;
  }
  return output;
}

function sampleBayer(bayer, x, y) {
  const safeX = clamp(x, 0, WIDTH - 1);
  const safeY = clamp(y, 0, HEIGHT - 1);
  return bayer[safeY * WIDTH + safeX];
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function demosaic(bayer) {
  const output = new Uint8ClampedArray(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const evenRow = y % 2 === 0;
      const evenColumn = x % 2 === 0;
      const center = sampleBayer(bayer, x, y);
      let red;
      let green;
      let blue;

      if (evenRow && evenColumn) {
        red = center;
        green = average([
          sampleBayer(bayer, x - 1, y),
          sampleBayer(bayer, x + 1, y),
          sampleBayer(bayer, x, y - 1),
          sampleBayer(bayer, x, y + 1),
        ]);
        blue = average([
          sampleBayer(bayer, x - 1, y - 1),
          sampleBayer(bayer, x + 1, y - 1),
          sampleBayer(bayer, x - 1, y + 1),
          sampleBayer(bayer, x + 1, y + 1),
        ]);
      } else if (evenRow) {
        green = center;
        red = average([sampleBayer(bayer, x - 1, y), sampleBayer(bayer, x + 1, y)]);
        blue = average([sampleBayer(bayer, x, y - 1), sampleBayer(bayer, x, y + 1)]);
      } else if (evenColumn) {
        green = center;
        red = average([sampleBayer(bayer, x, y - 1), sampleBayer(bayer, x, y + 1)]);
        blue = average([sampleBayer(bayer, x - 1, y), sampleBayer(bayer, x + 1, y)]);
      } else {
        blue = center;
        green = average([
          sampleBayer(bayer, x - 1, y),
          sampleBayer(bayer, x + 1, y),
          sampleBayer(bayer, x, y - 1),
          sampleBayer(bayer, x, y + 1),
        ]);
        red = average([
          sampleBayer(bayer, x - 1, y - 1),
          sampleBayer(bayer, x + 1, y - 1),
          sampleBayer(bayer, x - 1, y + 1),
          sampleBayer(bayer, x + 1, y + 1),
        ]);
      }

      const target = (y * WIDTH + x) * 4;
      output[target] = red;
      output[target + 1] = green;
      output[target + 2] = blue;
      output[target + 3] = 255;
    }
  }

  return output;
}

function colorAndGamma(input) {
  const output = new Uint8ClampedArray(input.length);
  const gamma = new Uint8ClampedArray(256);

  for (let value = 0; value < 256; value += 1) {
    gamma[value] = Math.pow(value / 255, 1 / 2.2) * 255;
  }

  for (let index = 0; index < input.length; index += 4) {
    const red = input[index];
    const green = input[index + 1];
    const blue = input[index + 2];

    const correctedRed = clamp((1382 * red - 113 * green - 246 * blue) / 1024);
    const correctedGreen = clamp((-484 * red + 1808 * green - 300 * blue) / 1024);
    const correctedBlue = clamp((102 * red - 860 * green + 1802 * blue) / 1024);

    output[index] = gamma[Math.round(correctedRed)];
    output[index + 1] = gamma[Math.round(correctedGreen)];
    output[index + 2] = gamma[Math.round(correctedBlue)];
    output[index + 3] = 255;
  }

  return output;
}

function bilateralFilter(input) {
  const output = new Uint8ClampedArray(input.length);
  const radius = 1;
  const sigmaRange = 22;
  const sigmaSpace = 1;
  const strength = 0.62;
  const spatialWeights = [];

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const distance = offsetX * offsetX + offsetY * offsetY;
      spatialWeights.push({
        offsetX,
        offsetY,
        weight: Math.exp(-distance / (2 * sigmaSpace * sigmaSpace)),
      });
    }
  }

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const centerIndex = (y * WIDTH + x) * 4;
      const centerRed = input[centerIndex];
      const centerGreen = input[centerIndex + 1];
      const centerBlue = input[centerIndex + 2];
      const centerLuminance = 0.2126 * centerRed + 0.7152 * centerGreen + 0.0722 * centerBlue;
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      let weightSum = 0;

      for (const item of spatialWeights) {
        const sampleX = clamp(x + item.offsetX, 0, WIDTH - 1);
        const sampleY = clamp(y + item.offsetY, 0, HEIGHT - 1);
        const sampleIndex = (sampleY * WIDTH + sampleX) * 4;
        const red = input[sampleIndex];
        const green = input[sampleIndex + 1];
        const blue = input[sampleIndex + 2];
        const sampleLuminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        const luminanceDistance = (sampleLuminance - centerLuminance) ** 2;
        const colorDistance = ((red - centerRed) ** 2 + (green - centerGreen) ** 2 + (blue - centerBlue) ** 2) / 3;
        const guidedDistance = luminanceDistance + colorDistance * 0.2;
        const rangeWeight = Math.exp(-guidedDistance / (2 * sigmaRange * sigmaRange));
        const weight = item.weight * rangeWeight;

        redSum += red * weight;
        greenSum += green * weight;
        blueSum += blue * weight;
        weightSum += weight;
      }

      output[centerIndex] = centerRed * (1 - strength) + (redSum / weightSum) * strength;
      output[centerIndex + 1] = centerGreen * (1 - strength) + (greenSum / weightSum) * strength;
      output[centerIndex + 2] = centerBlue * (1 - strength) + (blueSum / weightSum) * strength;
      output[centerIndex + 3] = 255;
    }
  }

  return output;
}

function sharpen(input) {
  const output = new Uint8ClampedArray(input.length);
  const amount = 0.85;
  const kernel = [
    [-1, -1, 1], [0, -1, 2], [1, -1, 1],
    [-1, 0, 2], [0, 0, 4], [1, 0, 2],
    [-1, 1, 1], [0, 1, 2], [1, 1, 1],
  ];

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const center = (y * WIDTH + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        let blurred = 0;
        for (const [offsetX, offsetY, weight] of kernel) {
          const sampleX = clamp(x + offsetX, 0, WIDTH - 1);
          const sampleY = clamp(y + offsetY, 0, HEIGHT - 1);
          blurred += input[(sampleY * WIDTH + sampleX) * 4 + channel] * weight;
        }
        blurred /= 16;
        output[center + channel] = clamp(
          input[center + channel] + amount * (input[center + channel] - blurred),
        );
      }
      output[center + 3] = 255;
    }
  }

  return output;
}

function increaseContrast(input) {
  const output = new Uint8ClampedArray(input.length);
  for (let index = 0; index < input.length; index += 4) {
    output[index] = clamp(((input[index] - 30) * 255) / 210);
    output[index + 1] = clamp(((input[index + 1] - 30) * 255) / 210);
    output[index + 2] = clamp(((input[index + 2] - 30) * 255) / 210);
    output[index + 3] = 255;
  }
  return output;
}

self.addEventListener("message", async ({ data }) => {
  if (data.type !== "run") return;
  const startedAt = performance.now();

  try {
    report(5, "Loading image", "Fetching the raw camera frame.");
    const response = await fetch(data.url, { cache: "force-cache" });
    if (!response.ok) throw new Error(`Raw image request failed with status ${response.status}.`);

    const source = new Uint8Array(await response.arrayBuffer());
    if (source.length !== SOURCE_WIDTH * SOURCE_HEIGHT) {
      throw new Error("The raw image size does not match the expected 4096 × 2160 frame.");
    }

    report(14, "Preparing preview", "Sampling Bayer blocks for a browser-sized output.");
    const bayer = downsampleBayer(source);
    const raw = rawPreview(bayer);

    report(28, "Reconstructing color", "Demosaicing the RGGB sensor pattern.");
    const demosaiced = demosaic(bayer);

    report(46, "Correcting color", "Applying the project color matrix and gamma curve.");
    const color = colorAndGamma(demosaiced);

    report(63, "Reducing noise", "Running an edge-aware bilateral filter.");
    const denoised = bilateralFilter(color);

    report(82, "Sharpening detail", "Increasing local edge contrast.");
    const sharpened = sharpen(denoised);

    report(94, "Finishing image", "Mapping the final contrast range.");
    const contrast = increaseContrast(sharpened);

    const stages = {
      raw: raw.buffer,
      demosaic: demosaiced.buffer,
      color: color.buffer,
      denoise: denoised.buffer,
      sharpen: sharpened.buffer,
      contrast: contrast.buffer,
    };

    self.postMessage(
      {
        type: "complete",
        width: WIDTH,
        height: HEIGHT,
        elapsedMs: performance.now() - startedAt,
        stages,
      },
      Object.values(stages),
    );
  } catch (error) {
    self.postMessage({ type: "error", message: error.message || "Unknown processing error." });
  }
});
