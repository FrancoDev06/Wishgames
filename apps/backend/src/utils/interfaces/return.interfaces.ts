export interface RequestReturn<T> {
	info: string;
	additional?: any;
	data?: T;
};

export interface RequestError extends RequestReturn<null> {
	error: string;
};
