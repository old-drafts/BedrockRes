import { readFileSync, writeFileSync } from 'fs';
import {
	Types,
	variantType,
	constantsType,
	functionType,
	interfaceType,
	enumType,
	classType
} from './types';

const types: Types = JSON.parse(readFileSync('./types.json', 'utf-8'));

interface typePorcessed {
	type: string;
	optional: boolean;
}

function resolveType(type: variantType): typePorcessed {
	if (type.name === 'array') {
		const eleType = type!.element_type;
		return {
			type: `array<${stringToLowerCase(eleType!.name)}>`,
			optional: false
		};
	} else if (type.name === 'optional') {
		const optionalType = type!.optional_type;
		return {
			type: stringToLowerCase(resolveType(optionalType!).type),
			optional: true
		};
	} else if (type.name === 'map') {
		return {
			type: `Js_map.t<${stringToLowerCase(type!.key_type!.name)},${
				resolveType(type!.value_type!).type
			}>`,
			optional: false
		};
	} else if (type.name === 'variant') {
		return {
			type: createUnion.apply(
				null,
				type!
					.variant_types!.map(resolveType)
					.map((v) => v.type)
					.map(stringToLowerCase)
			),
			optional: false
		};
	}
	return {
		type: stringToLowerCase(type.name),
		optional: false
	};
}

function stringToUpperCase(str: string): string {
	return str.slice(0, 1).toUpperCase() + str.slice(1, str.length);
}

function stringToLowerCase(str: string): string {
	if (str.startsWith('Js_map')) return str;
	let processed = str.slice(0, 1).toLowerCase() + str.slice(1, str.length);
	if (processed === 'type') processed = `\\"${processed}"`;
	if (processed === 'int32') processed = 'int';
	if (processed === 'boolean') processed = 'bool';
	if (processed === 'undefined') processed = 'unit';
	return processed;
}

function createUnion(...typeNames: string[]): string {
	return `@unwrap [${typeNames
		.map(
			(typeName) =>
				`|#${
					typeName.startsWith('array')
						? 'Array' + stringToUpperCase(typeName.match(/(?<=<).*?(?=>)/)![0])
						: stringToUpperCase(typeName)
				}(${stringToLowerCase(typeName)})`
		)
		.join('')}]`;
}

function transformInterface(name: string, vars: constantsType[]): string {
	return `type ${name}={${vars
		.map((v) => {
			const { type, optional } = resolveType(v.type);
			if (optional) return `${stringToLowerCase(v.name)}?:${type}`;
			else return `${stringToLowerCase(v.name)}:${type}`;
		})
		.join(',')}}\n`;
}

function transformFunction(func: functionType): string {
	if (func.arguments.length === 1)
		func.arguments.push({
			details: null,
			name: 'unit',
			type: {
				name: 'unit',
				is_bind_type: false,
				is_errorable: false
			}
		});
	return `external ${stringToLowerCase(func.name)}: (${func.arguments
		.map((v) => v.type)
		.map(resolveType)
		.map((v) => v.type)
		.map(stringToLowerCase)
		.join(',')}) => ${stringToLowerCase(resolveType(func.return_type).type)} = "${
		func.name
	}"\n`;
}

function InterfacesHandler(interfaces: interfaceType[]): string {
	let context = '';
	for (const current of interfaces) {
		context += transformInterface(stringToLowerCase(current.name), current.properties);
		context += '\n';
	}
	return context;
}

function ConstantsHandler(constants: constantsType[]): string {
	let context = '';
	for (const current of constants) {
		context += `@module @val external ${stringToLowerCase(current.name)}: ${stringToLowerCase(
			stringToLowerCase(resolveType(current.type).type)
		)} = "${current.name}"\n`;
		context += '\n';
	}
	return context;
}

function EnumHandler(enums: enumType[]): string {
	let context = '';
	for (const current of enums) {
		context += `let ${stringToLowerCase(current.name)} = {${current.constants
			.map((v) => `"${v.name}":${typeof v.value === 'string' ? `"${v.value}"` : v.value}`)
			.map(stringToLowerCase)
			.join(',')}}\n`;
		context += '\n';
	}
	return context;
}

function ClassHandler(classes: classType[]): string {
	let context = '';
	for (const current of classes) {
		context += '@module("@minecraft/server")\n';
		context += `type ${stringToLowerCase(current.name)}\n`;
		if (current.base_types.length === 1) {
			const base = classMap.get(current.base_types[0].name);
			current.constants.push(...base!.constants);
			current.functions.push(...base!.functions);
			current.properties.push(...base!.properties);
		}
		for (const currentFunction of current.functions) {
			currentFunction.arguments = [
				{
					details: null,
					name: 'bind',
					type: {
						name: stringToLowerCase(current.name),
						is_bind_type: false,
						is_errorable: false
					}
				},
				...currentFunction.arguments
			];
			context += `@send ${transformFunction(currentFunction)}`;
		}
		for (const currentValue of current.constants) {
			context += `@val @scope("${current.name}") external ${
				currentValue.name + '_' + current.name
			}: ${stringToLowerCase(resolveType(currentValue.type).type)} = "${
				currentValue.name
			}"\n`;
		}

		for (const currentProperties of current.properties) {
			context += `@val @scope("${current.name}") external ${
				currentProperties.name + '_' + current.name
			}: ${stringToLowerCase(resolveType(currentProperties.type).type)} = "${
				currentProperties.name
			}"\n`;
		}
		context += '\n';
	}
	return context;
}

const classMap = new Map<string, classType>();

(function ClassesMap() {
	for (const current of types.classes) {
		classMap.set(current.name, current);
	}
})();

writeFileSync(
	'types.res',
	ClassHandler(types.classes) +
		InterfacesHandler(types.interfaces) +
		EnumHandler(types.enums) +
		ConstantsHandler(types.constants)
);
