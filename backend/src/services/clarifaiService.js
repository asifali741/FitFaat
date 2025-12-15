import { ClarifaiStub, grpc } from 'clarifai-nodejs-grpc';

class ClarifaiService {
  constructor() {
    this.stub = null;
    this.metadata = null;
    this.initialized = false;
    
    // Configuration for the public food model
    this.config = {
      user_id: 'clarifai',
      app_id: 'main',
      model_id: 'food-item-recognition',
      model_version_id: '',
    };
  }

  initialize() {
    if (this.initialized) return;
    this.stub = ClarifaiStub.grpc();
    const metadata = new grpc.Metadata();
    if (!process.env.CLARIFAI_API_KEY) {
      throw new Error('CLARIFAI_API_KEY is not set');
    }
    metadata.set('authorization', `Key ${process.env.CLARIFAI_API_KEY}`);
    this.metadata = metadata;
    this.initialized = true;
  }

  detectFoodFromUrl(imageUrl) {
    this.initialize();
    return new Promise((resolve, reject) => {
      this.stub.PostModelOutputs(
        {
          user_app_id: { user_id: this.config.user_id, app_id: this.config.app_id },
          model_id: this.config.model_id,
          version_id: this.config.model_version_id,
          inputs: [{ data: { image: { url: imageUrl } } }],
        },
        this.metadata,
        (err, response) => {
          if (err) {
            console.error('Clarifai API Error (URL):', err);
            return reject(err);
          }
          if (response.status.code !== 10000) {
            console.error('Clarifai Response Error (URL):', {
              code: response.status.code,
              description: response.status.description,
              details: response.status.details
            });
            return reject(new Error(response.status.description || 'Failed to process image'));
          }
          try {
            resolve(this.parseResults(response));
          } catch (e) {
            reject(e);
          }
        }
      );
    });
  }

  detectFoodFromBase64(base64Image) {
    this.initialize();
    return new Promise((resolve, reject) => {
      this.stub.PostModelOutputs(
        {
          user_app_id: { user_id: this.config.user_id, app_id: this.config.app_id },
          model_id: this.config.model_id,
          version_id: this.config.model_version_id,
          inputs: [{ data: { image: { base64: base64Image } } }],
        },
        this.metadata,
        (err, response) => {
          if (err) {
            console.error('Clarifai API Error (Base64):', err);
            return reject(err);
          }
          if (response.status.code !== 10000) {
            console.error('Clarifai Response Error (Base64):', {
              code: response.status.code,
              description: response.status.description,
              details: response.status.details,
              req_id: response.status.req_id
            });
            return reject(new Error(response.status.description || 'Failed to process image'));
          }
          try {
            resolve(this.parseResults(response));
          } catch (e) {
            console.error('Parse error:', e);
            reject(e);
          }
        }
      );
    });
  }

  parseResults(response) {
    if (!response.outputs || response.outputs.length === 0) {
      throw new Error('No outputs');
    }
    const output = response.outputs[0];
    if (!output.data || !output.data.concepts || output.data.concepts.length === 0) {
      throw new Error('No food items detected');
    }
    const concepts = output.data.concepts
      .map((c) => ({ name: c.name, confidence: Math.round(c.value * 100) / 100 }))
      .sort((a, b) => b.confidence - a.confidence);
    return {
      success: true,
      foodName: concepts[0].name,
      confidence: concepts[0].confidence,
      allDetections: concepts.slice(0, 5),
      totalDetections: concepts.length,
    };
  }
}

const service = new ClarifaiService();
export default service;
