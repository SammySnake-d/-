import { window, ExtensionContext, commands, QuickPickItem, QuickPickOptions, workspace, TreeItem } from 'vscode';
import translateUtil from './utils/translate';
import varCaseTypes from './utils/transform';
import { filterCharacter, stringTrim } from './utils/index';

// 翻译引擎
enum TranslateUtilType {
	deepl = "deepl",
	deeplAPI = "deeplAPI",
	bing = "bing",
	google = "google",
	baidu = "baidu",
	tenCent = "tenCent",
	ali = "ali",
	youDao = "youDao",

}

enum ChineseAbbreviationType {
	google = "zh-CN",
	deepl = "ZH",
	deeplAPI = "ZH",
	bing = "zh-Hans",
	baidu = "zh",
	tenCent = "zh",
	ali = "zh",
	youDao = "zh-CHS",
}
enum EnglishAbbreviationType {
	google = "en",
	deepl = "EN",
	deeplAPI = "en-US",
	bing = "en",
	baidu = "en",
	tenCent = "en",
	ali = "en",
	youDao = "en",
}


interface CommandMapItemType {
	command: string,
	callback: () => {},
}

/**
 * 获取待注册命令集合
 * @returns { CommandMapItemType[] }
 */
const getCommandMap: () => CommandMapItemType[] = (): CommandMapItemType[] => {
	const commandList: CommandMapItemType[] = varCaseTypes.map(({ namingFormat }): CommandMapItemType => ({ command: `extension.var-translate-en.${namingFormat}`, callback: () => namingFormatSelected(namingFormat) }));
	return [
		{ command: 'extension.var-translate-en-constantCase', callback: () => translateHandler('en', 'constantCase') }, //添加注册
		{ command: 'extension.var-translate-en', callback: () => translateHandler('en') },
		{ command: 'extension.var-translate-zh', callback: () => translateHandler('zh') },
		...commandList
	];
};




/**
 * 翻译处理方法
 * @param { string } translateTo 要翻译成什么语言 默认英语(en)
 * 
 */
const translateHandler = async (translateTo: string = 'en', style?: string) => {
	const { activeTextEditor } = window;
	// 获取用户选择翻译服务
	const translateType: TranslateUtilType = workspace.getConfiguration("var-translate-en").translateServe;
	const targetLanguage = translateTo === 'en' ? EnglishAbbreviationType[translateType] : ChineseAbbreviationType[translateType];

	if (!activeTextEditor) {

		return;
	}
	const originText = activeTextEditor.document.getText(activeTextEditor.selection);
	const translateResult = await asyncLanguageTranslate(translateTo === 'en' ? originText : filterCharacter(originText), targetLanguage, style ? true : undefined);
	if (!translateResult) {
		// 显示错误消息 3 秒后自动消失
		window.setStatusBarMessage("没有得到翻译结果", 3000);
		return;
	}
	let selected: string | undefined;


	if (translateTo === 'en') {

		//如果style有值，就使用style，否则使用原来

		const selectedFormat = varCaseTypes.find(item => item.namingFormat === style)
		if (selectedFormat) {

			selected = selectedFormat.transformHandler(translateResult);
		}
		else {
			//没有设置style，使用原来的代码
			selected = await namingFormatSelected(translateResult);
		}


	} else {
		const quickPickItem = await window.showQuickPick([{ label: translateResult }], { title: '翻译结果如下（Translation Results Are As Follows）' });
		quickPickItem && (selected = quickPickItem.label);
	}
	// 用户选择命令类型
	if (!selected) {
		return;
	}
	// 替换文本
	activeTextEditor.edit((builder) => builder.replace(activeTextEditor.selection, selected as string));
};

/**
 * 翻译引擎 网络翻译
 * @param { string } originText 待翻译的内容
 * @param { string } translateTo 要翻译成什么语言 默认英语(en)
 * @returns { string | undefined  }
 */
const asyncLanguageTranslate = async (originText: string, translateTo: string, NoSelect?: boolean): Promise<string | undefined> => {
	// 获取用户选择翻译服务
	const translateType: TranslateUtilType = workspace.getConfiguration("var-translate-en").translateServe;
	originText = stringTrim(originText);
	if (!originText) {
		return;
	}
	// 英文直接返回
	if (/^[a-zA-Z_-]$/u.test(originText)) {
		return originText;
	}
	const foreign = [
		{ name: 'deepl', alias: 'DeepL', undulate: true },
		{ name: 'deeplAPI', alias: 'DeepL API', undulate: true },
		{ name: 'google', alias: '谷歌', undulate: true },
		{ name: 'bing', alias: '必应', undulate: true },
		{ name: 'baidu', alias: '百度', undulate: false },
		{ name: 'tenCent', alias: '腾讯', undulate: false },
		{ name: 'ali', alias: '阿里', undulate: false },
		{ name: 'youDao', alias: '有道', undulate: false },
	];

	// 获取默认命名风格设置
	const defaultNamingStyle = workspace.getConfiguration("var-translate-en").defaultNamingStyle;

	// 获取 EnglishAbbreviationType 枚举的值数组
	const englishAbbreviationValues = Object.values(EnglishAbbreviationType) as string[];


	// 如果设置了默认命名风格并且目标是EnglishAbbreviationType（可以用命名风格），在选中的文本区域右边显示⟳

	if ((defaultNamingStyle && englishAbbreviationValues.includes(translateTo)) || NoSelect) {
		const { activeTextEditor } = window;
		if (!activeTextEditor) {
			return;
		}
		const selection = activeTextEditor.selection;
		const decorationType = window.createTextEditorDecorationType({
			after: {
				contentText: '⟳',
				margin: '0 0 0 5px',
				color: 'gray'

			}
		});

		activeTextEditor.setDecorations(decorationType, [selection]);
		try {
			const translateResult = await translateUtil[translateType].translate(originText, translateTo);
			return translateResult;
		} catch (err) {
			window.showQuickPick([{ label: '翻译出错，详细错误信息请看右下角错误提示弹窗' }]);
			window.showErrorMessage(`翻译失败，请检查网络链接或配置项是否正确
			错误信息: ${JSON.stringify(err)}`);
			return;
		}
		finally {
			if (decorationType) {
				const { activeTextEditor } = window;
				if (activeTextEditor) {
					activeTextEditor.setDecorations(decorationType, []);
				}
			}
		}
	} else {
		//否则使用原来的代码
		const findForeign = foreign.find(item => item.name === translateType);
		window.showQuickPick([{ label: `🚀当前使用${findForeign?.alias}翻译中 请稍等...${findForeign?.undulate ? '(' + findForeign.alias + '翻译会受网络环境影响、建议配置国内翻译厂商)' : ''}` }]);
		try {
			const translateResult = await translateUtil[translateType].translate(originText, translateTo);
			return translateResult;
		} catch (err) {
			window.showQuickPick([{ label: '翻译出错，详细错误信息请看右下角错误提示弹窗' }]);
			window.showErrorMessage(`翻译失败，请检查网络链接或配置项是否正确
			错误信息: ${JSON.stringify(err)}`);
			return;
		}
	}




};

/**
 * 命名风格选择
 * @param { string} transformContent 待转换的文本内容
 * @returns { string | undefined  }
 */
const namingFormatSelected = async (transformContent: string): Promise<string | undefined> => {



	// 获取默认命名风格
	const defaultNamingStyle: string = workspace.getConfiguration("var-translate-en").defaultNamingStyle;

	// 如果设置了默认命名风格，使用默认的风格

	if (defaultNamingStyle) {
		const selectedFormat = varCaseTypes.find(item => item.namingFormat === defaultNamingStyle);
		if (selectedFormat) {
			return selectedFormat.transformHandler(transformContent);
		}
	}

	// 如果没有设置默认风格，显示选择框(使用原来的代码)



	const selectList: QuickPickItem[] = varCaseTypes.map((item): QuickPickItem => ({
		label: item.transformHandler(transformContent),
		description: item.description,
	}));
	const selectDescription: QuickPickOptions = { matchOnDescription: true, title: '翻译结果如下（Translation Results Are As Follows）', placeHolder: "选择想要的命名风格，点击或回车替换 (Choose to replace)" };
	const selected: QuickPickItem | undefined = await window.showQuickPick(selectList, selectDescription);
	if (!selected) {
		return;
	}
	return selected.label;
};

export function activate(context: ExtensionContext): void {
	const pendingRegistrationCommandList: CommandMapItemType[] = getCommandMap();
	// 注册指令
	pendingRegistrationCommandList.forEach(({ command, callback }): void => {
		context.subscriptions.push(commands.registerCommand(command, callback));
	});
}


export function deactivate() { }
