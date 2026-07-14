import chalk from "chalk";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export default class LogUtil {

	static conserror(...text: string[]): void {
		console.error(`${dayjs().toISOString()} | ERROR |`, chalk.bgRed.white(`${text.join(' ')}`));
	}

	static consinfo(...text: string[]): void {
		console.info(`${dayjs().toISOString()} | INFO |`, chalk.bgWhite.black(` ${text.join(' ')} `));
	}

	static conslog(...text: string[]): void {
		console.info(`${dayjs().toISOString()} | LOG |`, chalk.cyan.italic(text.join(' ')));
	}

	static conssuccess(...text: string[]): void {
		console.log(`${dayjs().toISOString()} | SUCCESS |`, chalk.bgGreen.white(`${text.join(' ')}`));
	}

	static conswarn(...text: string[]): void {
		console.warn(`${dayjs().toISOString()} | WARN |`, chalk.yellow(text.join(' ')));
	}
}