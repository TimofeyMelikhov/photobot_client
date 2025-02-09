// Функция для очистки номера телефона
const cleanPhoneNumber = (phone) => {
  return phone.replace(/[^\d+]/g, ""); // Удаляем всё, кроме цифр и знака "+"
};

export const validateContactMethod = (contactMethod) => {
  // Регулярные выражения для проверки
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Проверка email
  const phoneRegex = /^(\+7|8|7)\d{10}$/; // Проверка номера телефона (российский формат)
  const instagramRegex = /^@?[a-zA-Z0-9_]{5,30}$/; // Проверка Instagram (начинается с @ или без него, минимум 5 символов)
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/; // Проверка URL
  const usernameRegex = /^@[a-zA-Z0-9_]{5,30}$/; // Проверка Telegram username (начинается с @, минимум 5 символов)

  // Проверяем, является ли введенный текст номером телефона
  const isPhoneNumber =
    contactMethod.startsWith("+7") ||
    contactMethod.startsWith("8") ||
    contactMethod.startsWith("7");

  // Если это номер телефона, очищаем его
  const cleanedContactMethod = isPhoneNumber
    ? cleanPhoneNumber(contactMethod)
    : contactMethod;

  // Проверка на соответствие хотя бы одному из шаблонов
  return (
    emailRegex.test(contactMethod) ||
    (isPhoneNumber && phoneRegex.test(cleanedContactMethod)) ||
    instagramRegex.test(contactMethod) ||
    urlRegex.test(contactMethod) ||
    usernameRegex.test(contactMethod)
  );
};
