import * as ort from 'onnxruntime-web';

export class CompareFace {
    constructor(inputMean = 127.5, inputStd = 127.5, swapRB = true) {
        this.session = null;
        this.inputMean = inputMean;
        this.inputStd = inputStd;
        this.swapRB = swapRB;
    }

    async loadModel(modelPath) {
        this.session = await ort.InferenceSession.create(modelPath, {
            executionProviders: ['wasm']
        });
    }

    async getEmb(imageData) {
        if (!this.session) throw new Error('Model is not loaded!');

        const emb = await getEmbedding(imageData, this.inputMean, this.inputStd, this.swapRB, this.session);
        if (!emb) throw new Error('Failed to get embedding!');

        return emb;
    }

    async compareFace(emb, vec) {
        const percent = mostSimilarityGetData(emb, vec);
        return percent * 100;
    }
}

export async function getEmbedding(faceImage, inputMean, inputStd, swapRB, session) {
    const tensor = preprocessImage(faceImage, inputMean, inputStd, swapRB);

    const feeds = {};
    feeds[session.inputNames[0]] = tensor;

    const results = await session.run(feeds);
    const outputName = session.outputNames[0];

    return results[outputName].data;
}

function preprocessImage(imageData, inputMean, inputStd, swapRB) {
    const {width, height, data} = imageData;
    const floatData = new Float32Array(width * height * 3);

    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4] / 255;
        const g = data[i * 4 + 1] / 255;
        const b = data[i * 4 + 2] / 255;

        floatData[i * 3] = swapRB ? (b - inputMean) / inputStd : (r - inputMean) / inputStd;
        floatData[i * 3 + 1] = (g - inputMean) / inputStd;
        floatData[i * 3 + 2] = swapRB ? (r - inputMean) / inputStd : (b - inputMean) / inputStd;
    }

    return new ort.Tensor("float32", floatData, [1, 3, height, width]);
}

function cosineSimilarity(vecA, vecB) {
    const normalize = (vec) => {
        const norm = Math.sqrt(vec.reduce((sum, val) => sum + val ** 2, 0));
        return norm === 0 ? vec : vec.map(val => val / norm);
    };

    const normA = normalize(vecA);
    const normB = normalize(vecB);
    return normA.reduce((sum, val, i) => sum + val * normB[i], 0);
}

function mostSimilarityGetData(emb, vec) {
    if (vec.length === 0) return 0;
    const similarities = vec.map(v => cosineSimilarity(v, emb));
    return Math.max(...similarities);
}
