/**
 * 生成区间随机数
 * @param start 开始大小
 * @param end 结束大小
 * @returns 
 */
export const getRandomNumber = (start: number, end: number): number => (Math.random() * (end - start)) + start;

/**
 * 随机key生成方法
 * @param length key长度
 * @returns 
 */
export const getUniqueKey = (length = 10) => {
  const num = '0123456789';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const chars = `${num}${lowercase}${uppercase}`;
  const end = chars.length;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[getRandomNumber(0, end)];
  }
  return result;
};

/**
 * 字符串去首尾空格
 * @param text 文本
 * @returns 
 */
export const stringTrim = (text: string) => {
  return String(text).trim();
};

// 过滤掉一下字符
export function filterCharacter(str: string) {  
  return str.replace(/[-_\\\/.·]/g, ' ');
}  