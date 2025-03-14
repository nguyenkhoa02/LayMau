import axios from 'axios';

const api_host = process.env.REACT_APP_API_URL;

export const trainAPI = async () => {
  try {
    const response = await axios.post(`${api_host}/train_model/train-model`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message || 'An error occurred during login');
  }
};

export const applyAPI = async () => {
  try {
    const response = await axios.post(`${api_host}/train_model/apply`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message || 'An error occurred during login');
  }
};
