import axios from "axios";

const api_host = process.env.REACT_APP_API_URL;
export const sendFaceAPI = async (data) => {
  try {
    const response = await axios.post(`${api_host}/faces/images`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "An error occurred during the request",
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export const getFacesAPI = async ([page, limit]) => {
  try {
    const response = await axios.get(`${api_host}/faces/faces`, {
      params: { page, limit },
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "An error occurred during the request",
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export const getFaceByCodeAPI = async (code) => {
  try {
    const response = await axios.get(`${api_host}/faces/${code}`, {
      // params: { code },
      // headers: {
      //   'Content-Type': 'application/json',
      // },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "An error occurred during the request",
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export const sendVideoAPI = async (data) => {
  try {
    const response = await axios.post(`${api_host}/faces/video`, data, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "An error occurred during the request",
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export const deleteFaceAPI = async (data) => {
  try {
    const response = await axios.delete(`${api_host}/faces/face/${data}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "An error occurred during the request",
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export const updateFaceAPI = async (data) => {
  try {
    const response = await axios.put(
      `${api_host}/faces/face/${data.code}`,
      data,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "An error occurred during the request",
      );
    }
    throw new Error("An unexpected error occurred");
  }
};
