import { workspace } from "vscode";
import { SourceLanguageCode, TargetLanguageCode, Translator } from "deepl-node";
import { reqBaiDuTranslate, reqYouDaoTranslate } from "../api/index";
import { translate as deeplTranslate } from "deeplx";
import { getUniqueKey, stringTrim } from "./index";
import md5 from "./md5";
import type { SourceLanguage, TargetLanguage } from "deeplx";
const cryptoJS = require("crypto-js");
const tenCent = require("tencentcloud-sdk-nodejs");
const google = require("@asmagin/google-translate-api");
const aliCore = require("@alicloud/pop-core");
const { translate: bingTranslate } = require("bing-translate-api");
// 翻译抽象类
abstract class LanguageTranslateHandler {
  /**
   * @param { String } originText 要翻译的文本
   * @param { String } translateTo 要翻译至什么语言
   * @param { String } originType 源文本语言类型
   */
  abstract translate(
    originText: string,
    translateTo?: string,
    originType?: string
  ): Promise<string | undefined>;
}
// 百度翻译
class BaiduLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "en",
    originType: string = "auto"
  ): Promise<string> {
    interface BaiduRes {
      from: string;
      to: string;
      trans_result: { src: string; dst: string }[];
    }
    // 获取翻译配置
    let { baiduAppid, baiduSecretKey } =
      workspace.getConfiguration("var-translate-en");
    baiduAppid = stringTrim(baiduAppid);
    baiduSecretKey = stringTrim(baiduSecretKey);
    return new Promise(async (resolve, reject): Promise<void> => {
      if (!baiduAppid || !baiduSecretKey) {
        reject(`使用百度翻译, 但${baiduAppid ? "密钥" : "APP ID"}不存在`);
        return;
      }
      const salt: string = getUniqueKey();
      const sign: string = md5(
        `${baiduAppid}${originText}${salt}${baiduSecretKey}`
      );
      const res: BaiduRes = (await reqBaiDuTranslate({
        q: originText,
        from: originType,
        to: translateTo,
        appid: baiduAppid,
        salt,
        sign,
      }).catch(reject)) as BaiduRes;
      const content: string = res.trans_result
        ?.map((item: { src: string; dst: string }): string => item.dst)
        ?.join(" ");
      resolve(content);
    });
  }
}
// 腾讯翻译
class TenCentLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "en",
    originType: string = "auto"
  ): Promise<string> {
    const tenCenClient = tenCent.tmt.v20180321.Client;
    // 获取翻译配置
    let { tenCentSecretId, tenCentSecretKey } =
      workspace.getConfiguration("var-translate-en");
    tenCentSecretId = stringTrim(tenCentSecretId);
    tenCentSecretKey = stringTrim(tenCentSecretKey);
    return new Promise(async (resolve, reject): Promise<void> => {
      if (!tenCentSecretId || !tenCentSecretKey) {
        reject(
          `使用腾讯翻译, 但${tenCentSecretId ? "密钥(SecretKey)" : "SecretId"
          }不存在`
        );
        return;
      }
      const clientConfig = {
        credential: {
          secretId: tenCentSecretId,
          secretKey: tenCentSecretKey,
        },
        region: "ap-chengdu",
        profile: {
          httpProfile: {
            endpoint: "tmt.tencentcloudapi.com",
          },
        },
      };
      const client = new tenCenClient(clientConfig);
      const res = await client
        .TextTranslate({
          SourceText: originText,
          Source: originType,
          Target: translateTo,
          ProjectId: 0,
        })
        .catch(reject);
      resolve(res.TargetText);
    });
  }
}
// 有道翻译
class YouDaoLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "en",
    originType: string = "auto"
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      interface YouDaoRes {
        translation: string[];
      }
      // 获取翻译配置
      let { youDaoAppid, youDaoSecretKey } =
        workspace.getConfiguration("var-translate-en");
      youDaoAppid = stringTrim(youDaoAppid);
      youDaoSecretKey = stringTrim(youDaoSecretKey);
      if (!youDaoAppid || !youDaoSecretKey) {
        reject(
          `使用有道翻译, 但${youDaoAppid ? "密钥(SecretKey)" : "APP ID"}不存在`
        );
        return;
      }
      const truncate = (q: string) => {
        const len = q.length;
        if (len <= 20) {
          return q;
        }
        return q.substring(0, 10) + len + q.substring(len - 10, len);
      };
      const salt = new Date().valueOf();
      const curtime = Math.round(new Date().getTime() / 1000);
      const str1 =
        youDaoAppid + truncate(originText) + salt + curtime + youDaoSecretKey;
      const sign = cryptoJS.SHA256(str1).toString(cryptoJS.enc.Hex);
      const res: YouDaoRes = (await reqYouDaoTranslate({
        q: originText,
        from: originType,
        to: translateTo,
        appKey: youDaoAppid,
        salt: salt,
        sign: sign,
        signType: "v3",
        curtime: curtime,
      }).catch(reject)) as YouDaoRes;
      resolve(res.translation.join(""));
    });
  }
}

// 阿里翻译
class AliLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "en",
    originType: string = "auto"
  ): Promise<string> {
    // 获取翻译配置
    let { aliAccessKeyID, aliAccessKeySecret } =
      workspace.getConfiguration("var-translate-en");
    aliAccessKeyID = stringTrim(aliAccessKeyID);
    aliAccessKeySecret = stringTrim(aliAccessKeySecret);
    return new Promise(async (resolve, reject): Promise<void> => {
      if (!aliAccessKeyID || !aliAccessKeySecret) {
        reject(
          `使用阿里翻译, 但${aliAccessKeyID ? "密钥(AccessKey Secret)" : "AccessKey ID"
          }不存在`
        );
        return;
      }
      const client = new aliCore({
        accessKeyId: aliAccessKeyID,
        accessKeySecret: aliAccessKeySecret,
        endpoint: "https://mt.cn-hangzhou.aliyuncs.com",
        apiVersion: "2018-10-12",
      });

      const params = {
        RegionId: "cn-chengdu",
        FormatType: "text",
        SourceLanguage: originType,
        TargetLanguage: translateTo,
        SourceText: originText,
      };
      const res = await client
        .request("TranslateGeneral", params, { method: "POST" })
        .catch(reject);
      resolve(res.Data.Translated);
    });
  }
}

// 谷歌翻译
class GoogleLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "en",
    originType: string = "auto"
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const res = await google(originText, {
        from: originType,
        to: translateTo,
        tld: "com",
      }).catch(reject);
      resolve(res?.text ?? "");
    });
  }
}
// DeepL翻译
class DeepLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "EN",
    originType: string = ""
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const res = await deeplTranslate(
        originText,
        translateTo as TargetLanguage,
        originType as SourceLanguage
      ).catch(reject);
      resolve(res as string);
    });
  }
}

// 必应翻译
class BingLanguageTranslateHandler implements LanguageTranslateHandler {
  translate(
    originText: string,
    translateTo: string = "en",
    originType: string = "auto-detect"
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const res = await bingTranslate(
        originText,
        originType,
        translateTo
      ).catch(reject);
      resolve(res.translation as string);
    });
  }
}

// DeepL API翻译
class deeplAPILanguageTranslateHandler implements LanguageTranslateHandler {
  /**
   * 翻译方法
   * @param originText 要翻译的文本
   * @param translateTo 目标语言代码，默认 'EN-US'
   * @param originType 源语言类型，默认 null（自动检测）
   * @returns Promise<string>
   */
  translate(
    originText: string,
    translateTo: string = "EN-US",
    originType: string|null = null
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // 获取翻译配置
        let { deeplApiKeySecret } = workspace.getConfiguration("var-translate-en");
        deeplApiKeySecret = stringTrim(deeplApiKeySecret);

        if (!deeplApiKeySecret) {
          reject("使用 DeepL API 翻译，但授权密钥（Auth Key）不存在");
          return;
        }

        const translator = new Translator(deeplApiKeySecret);

        // 构建请求数据
        const result = await translator.translateText(
          originText,
          originType as SourceLanguageCode,
          translateTo as TargetLanguageCode
        );

        resolve(result.text);
      } catch (error) {
        reject(error instanceof Error ? error.message : String(error));
      }
    });
  }
}

export default {
  google: new GoogleLanguageTranslateHandler(),
  deepl: new DeepLanguageTranslateHandler(),
  bing: new BingLanguageTranslateHandler(),
  baidu: new BaiduLanguageTranslateHandler(),
  tenCent: new TenCentLanguageTranslateHandler(),
  youDao: new YouDaoLanguageTranslateHandler(),
  ali: new AliLanguageTranslateHandler(),
  deeplAPI: new deeplAPILanguageTranslateHandler(),
};
