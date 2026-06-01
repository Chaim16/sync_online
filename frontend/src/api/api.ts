import axiosInstance from "@/utils/axios";

const api = {
  userRegister: async (body: object) => {
    const res = await axiosInstance.post("/market/api/v1/user/register/", body);
    return res.data;
  },
  userLogin: async (body: object) => {
    const res = await axiosInstance.post("/api/token/", body);
    return res.data;
  },
  whoami: async () => {
    const res = await axiosInstance.get("/market/api/v1/user/whoami/");
    return res.data;
  },
  crawler: async (params: object) => {
    const res = await axiosInstance.get("/market/api/v1/home/crawler/", {
      params,
    });
    return res.data;
  },
  userDetail: async () => {
    const res = await axiosInstance.get("/market/api/v1/user/user_detail/", {});
    return res.data;
  },
  userModify: async (body: object) => {
    const res = await axiosInstance.post("/market/api/v1/user/modify/", body);
    return res.data;
  },
  designerApplicationRecord: async () => {
    const res = await axiosInstance.get(
      "/market/api/v1/user/designer_application_record/"
    );
    return res.data;
  },
  applyAsDesigner: async (body: object) => {
    const res = await axiosInstance.post(
      "/market/api/v1/user/apply_as_designer/",
      body
    );
    return res.data;
  },
  walletRecharge: async (body: object) => {
    const res = await axiosInstance.post("/market/api/v1/user/recharge/", body);
    return res.data;
  },
  applyDesignerList: async (params: object) => {
    const res = await axiosInstance.get(
      "/market/api/v1/user/apply_designer_list/",
      { params }
    );
    return res.data;
  },
  approveDesignerApplication: async (body: object) => {
    const res = await axiosInstance.post(
      "/market/api/v1/user/approve_designer_application/",
      body
    );
    return res.data;
  },
  userList: async (params: object) => {
    const res = await axiosInstance.get("/market/api/v1/user/user_list/", {
      params,
    });
    return res.data;
  },
  publishDraft: async (body: object) => {
    const res = await axiosInstance.post("/market/api/v1/draft/publish/", body);
    return res.data;
  },
  draftList: async (params: object) => {
    const res = await axiosInstance.get("/market/api/v1/draft/draft_list/", {
      params,
    });
    return res.data;
  },
  createOrder: async (body: object) => {
    const res = await axiosInstance.post(
      "/market/api/v1/order/create_order/",
      body
    );
    return res.data;
  },
  orderList: async (params: object) => {
    const res = await axiosInstance.get("/market/api/v1/order/order_list/", {
      params,
    });
    return res.data;
  },
  orderPay: async (body: object) => {
    const res = await axiosInstance.post("/market/api/v1/order/pay/", body);
    return res.data;
  },
  returnOrder: async (body: object) => {
    const res = await axiosInstance.post(
      "/market/api/v1/order/return_order/",
      body
    );
    return res.data;
  },
  deleteUser: async (body: object) => {
    const res = await axiosInstance.post("/market/api/v1/user/del_user/", body);
    return res.data;
  },
  deleteOrder: async (body: object) => {
    const res = await axiosInstance.post(
      "/market/api/v1/order/del_order/",
      body
    );
    return res.data;
  },
};

export default api;
