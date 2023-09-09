interface variantType {
	is_bind_type: boolean;
	is_errorable: boolean;
	name: string;
	valid_range?: {
		max?: number;
		min?: number;
	};
	key_type?: variantType;
	value_type?: variantType
	element_type?: variantType;
	optional_type?: variantType;
	variant_types?: variantType[];
}

interface argumentsType {
	details: null | {
		default_value?: boolean;
		max_value?: boolean;
		min_value?: boolean;
	};
	name: string;
	type: variantType;
}

interface functionType {
	arguments: argumentsType[];
	is_constructor: boolean;
	is_static: boolean;
	name: string;
	privilege: 'read_only' | 'none';
	return_type: variantType;
}

interface constantsType {
	is_read_only: boolean;
	is_static?: boolean;
	name: string;
	type: variantType;
	value: number | string;
}

interface classType {
	name: string;
	constants: constantsType[];
	base_types: variantType[];
	functions: functionType[];
	properties: constantsType[];
	type: variantType;
}

interface enumType {
	name: string;
	constants: constantsType[];
}

interface interfaceType {
	name: string;
	properties: constantsType[];
	type: variantType;
}

interface errorType extends interfaceType {}

interface Types {
	name: string;
	uuid: string;
	version: string;
	module_type: string;
	minecraft_version: string;
	classes: classType[];
	constants: constantsType[];
	enums: enumType[];
	errors: errorType[];
	functions: functionType[];
	interfaces: interfaceType[];
	objects: constantsType[];
}

export { Types, variantType, constantsType, functionType, interfaceType, enumType, classType };
