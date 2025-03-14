import axios from 'axios';

const api_host = process.env.REACT_APP_API_URL;
export const authenticateUser = async (username, password) => {
  try {
    const response = await axios.post(
      `${api_host}/login`,
      new URLSearchParams({ username, password }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response.data.message || 'An error occurred during login');
  }
};
