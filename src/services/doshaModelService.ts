import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';
import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import doshaLabels from '../assets/dosha-labels.json';
import { predictionFromScores } from '../utils/doshaScores';

const IMAGE_SIZE = 224;
const LABELS = doshaLabels.labels;

export type DoshaLabel = (typeof LABELS)[number];

export interface DoshaPrediction {
  dosha: DoshaLabel;
  confidence: number;
}

let modelPromise: Promise<TensorflowModel> | null = null;

const getModel = async (): Promise<TensorflowModel> => {
  if (!modelPromise) {
    modelPromise = loadTensorflowModel(
      require('../assets/ayurvedic_model.tflite'),
    ).catch(error => {
      modelPromise = null;
      throw error;
    });
  }

  const model = await modelPromise;
  const input = model.inputs[0];
  const output = model.outputs[0];

  if (
    model.inputs.length !== 1 ||
    !input ||
    input.dataType !== 'float32' ||
    input.shape.length !== 4 ||
    input.shape[1] !== IMAGE_SIZE ||
    input.shape[2] !== IMAGE_SIZE ||
    input.shape[3] !== 3
  ) {
    throw new Error(
      `The bundled model must accept one float32 RGB image with shape [1, ${IMAGE_SIZE}, ${IMAGE_SIZE}, 3].`,
    );
  }

  if (
    model.outputs.length !== 1 ||
    !output ||
    output.dataType !== 'float32' ||
    output.shape[output.shape.length - 1] !== LABELS.length
  ) {
    throw new Error(
      `The bundled model must return ${LABELS.length} float32 class scores matching dosha-labels.json.`,
    );
  }

  return model;
};

export const analyseDosha = async (
  imageUri: string,
): Promise<DoshaPrediction> => {
  const resized = await ImageResizer.createResizedImage(
    imageUri,
    IMAGE_SIZE,
    IMAGE_SIZE,
    'JPEG',
    100,
    0,
    undefined,
    false,
    { mode: 'stretch' },
  );
  const jpegBase64 = await RNFS.readFile(resized.path, 'base64');
  const decoded = jpeg.decode(toByteArray(jpegBase64), {
    useTArray: true,
    formatAsRGBA: true,
  });

  if (decoded.width !== IMAGE_SIZE || decoded.height !== IMAGE_SIZE) {
    throw new Error('Could not resize the selected photo to the model input size.');
  }

  const pixels = new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 3);
  for (let source = 0, target = 0; target < pixels.length; source += 4) {
    pixels[target++] = decoded.data[source] / 255;
    pixels[target++] = decoded.data[source + 1] / 255;
    pixels[target++] = decoded.data[source + 2] / 255;
  }

  const model = await getModel();
  const [output] = await model.run([pixels]);

  if (!(output instanceof Float32Array)) {
    throw new Error('The model did not return any class predictions.');
  }

  const prediction = predictionFromScores(output, LABELS);
  return {
    dosha: prediction.dosha,
    confidence: prediction.confidence,
  };
};
