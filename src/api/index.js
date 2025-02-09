import axios from "axios";
import config from "config";

export const Axios = axios.create({
  baseURL: config.get("BASE_URL"),
  headers: {
    "Content-Type": "application/json",
  },
});

// Получить фотографа по указанному полю (tg_user_id или id)
export const getPhotographer = async (field, value) => {
  const validFields = ["tg_user_id", "id"];
  if (!validFields.includes(field)) {
    throw new Error(`Недопустимое поле: ${field}`);
  }
  try {
    const photographer = await Axios.get(
      `photographers/${field}/${value}`
    ).then((res) => res.data);
    return photographer;
  } catch (err) {
    if (err.response?.status === 404) {
      return null;
    }
    console.error("Ошибка в getPhotographer:", err.message);
    throw err;
  }
};

// Получить дистрибьютора по telegramId
export const getDistributor = async (telegramId) => {
  try {
    const distributor = await Axios.get(`distributors/${telegramId}`).then(
      (res) => res.data
    );
    return distributor;
  } catch (err) {
    if (err.response?.status === 404) {
      return null;
    }
    console.error("Ошибка в getPhotographer:", err.message);
    throw err;
  }
};
