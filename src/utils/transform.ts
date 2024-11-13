import {
  camelCase,
  paramCase,
  pascalCase,
  snakeCase,
  constantCase,
  capitalCase,
  dotCase,
  headerCase,
  noCase,
  pathCase,
} from "change-case";
export default [
	{ namingFormat: "camelCase", transformHandler: camelCase, description: "小驼峰 (camelCase)" },
	{ namingFormat: "pascalCase", transformHandler: pascalCase, description: "大驼峰 (pascalCase)" },
	{ namingFormat: "snakeCase", transformHandler: snakeCase, description: "下划线链接 (snakeCase)" },
	{ namingFormat: "paramCase", transformHandler: paramCase, description: "小中划线链接 (paramCase)" },
	{ namingFormat: "headerCase", transformHandler: headerCase, description: "大中划线链接 (headerCase)" },
	{ namingFormat: "constantCase", transformHandler: constantCase, description: "常量 (constantCase)" },
	{ namingFormat: "dotCase", transformHandler: dotCase, description: "对象属性 (dotCase)" },
	{ namingFormat: "pathCase", transformHandler: pathCase, description: "路径 (pathCase)" },
	{ namingFormat: "noCase", transformHandler: noCase, description: "小分词 (noCase)" },
	{ namingFormat: "capitalCase", transformHandler: capitalCase, description: "大分词 (capitalCase)" },
];