import axios from "axios";

const baseURL = "http://localhost:8000";
const staticURL = baseURL + "/static/";

const axiosInstance = axios.create({
  baseURL: baseURL,
  timeout: 10000,
});

export interface ApiResponse {
  code: number;
  message: string;
  data: object;
}

// 刷新 Token 请求接口
export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken || refreshToken === "undefined") {
      throw new Error("没有找到 refresh_token");
    }
    const response = await axiosInstance.post("/api/token/refresh/", {
      refresh: refreshToken,
    });

    const { access, refresh } = response.data;
    localStorage.setItem("access_token", access);
    localStorage.setItem("refresh_token", refresh);
    return response.data;
  } catch (error) {
    console.error("刷新 Token 失败:", error);
    // 如果 refresh_token 不存在或者刷新失败，清除 token 并跳转到登录页
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/user/login";
  }
};

// Axios 请求拦截器：自动附加 access token
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      config.headers["Authorization"] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加响应拦截器：检测 token 是否过期并尝试刷新
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 如果 access token 过期，尝试使用 refresh token 刷新
      try {
        await refreshToken();
        const originalRequest = error.config;
        originalRequest.headers[
          "Authorization"
        ] = `Bearer ${localStorage.getItem("access_token")}`;
        return axios(originalRequest);
      } catch (refreshError) {
        console.error("刷新 Token 失败:", refreshError);
        window.location.href = "/user/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
export { baseURL, staticURL };
