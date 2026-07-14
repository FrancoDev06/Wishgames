import { RequestError } from "./interfaces/return.interfaces.js";

export default class ErrorsUtil {

	static _401(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_UNAUTHORIZED_ACTION',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _404(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_NO_DATA_FOUND',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _405(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_METHOD_NOT_ALLOWED',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _412(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_INVALID_PARAMETERS',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _422(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_UNPROCESSABLE_ENTITY',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _429(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_RATE_LIMITED',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _500(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_SOMETHING_WENT_WRONG',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}

	static _503(additional: any): RequestError {
		return {
			info: 'execko',
			error: 'ERROR_SERVICE_UNAVAILABLE',
			additional: JSON.parse(JSON.stringify(additional))
		};
	}
}
