const axios = require("axios");

interface ReqOptions {
  method?: string,
  url:string,
  data?: object;
}
interface Response {
  status: number,
  data: object,
}

/**
 * 公用请求方法
 * @param  { String } url api
 * @param  { Object } data 请求参数
 */
const REQ = ({ method = 'POST', url, data }: ReqOptions): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    axios({
      method,
      url,
      [method.toLowerCase() === 'get' ? 'params' : 'data']: data,
    }).then((res: Response)=> {
      resolve(res.data);
    }).catch((err: unknown) => {
      reject(err);
    });
  });
};

/**
 * 百度翻译接口
 * https://fanyi-api.baidu.com/api/trans/vip/translate
 * @param { object } data 请求参数对象
 */
export const reqBaiDuTranslate = (data: object) => REQ({
  method: 'GET',
  url: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
  data,
});

/**
 * 有道翻译接口
 * https://openapi.youdao.com/api
 * @param { object } data 请求参数对象
 */
export const reqYouDaoTranslate = (data: object) => REQ({
  method: 'GET',
  url: 'https://openapi.youdao.com/api',
  data,
});