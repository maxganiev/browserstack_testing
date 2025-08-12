// test.js - No parallel logic needed
const { Builder, By, until } = require('selenium-webdriver');
const fetch = require('node-fetch');

const REQUEST_PATTERN = 'https://esq.elcomspb.ru/assets';

const capabilities = {
	'bstack:options': {
		deviceName: 'iPhone 14',
		osVersion: '16',
		realMobile: 'true',
		browserName: 'Safari'
	},
	'browserName': 'Safari'
};

describe('DEMO', () => {
	let driver;

	beforeAll(() => {
		driver = new Builder()
			.usingServer(
				`https://${process.env.BROWSERSTACK_USER}:${process.env.BROWSERSTACK_KEY}@hub.browserstack.com/wd/hub`
			)
			.withCapabilities(capabilities)
			.build();
	});

	afterAll(async () => {
		const session = await driver.getSession();
		const sessionId = session.getId();

		//logPaths.push(`https://api.browserstack.com/automate/sessions/${sessionId}/networklogs`);

		await driver.quit();

		console.log({ browser_stack_session_id: sessionId });

		// await new Promise((resolve) =>
		// 	setTimeout(() => {
		// 		resolve(true);
		// 	}, 100000)
		// );

		// try {
		// 	const response = await fetch(
		// 		`https://api.browserstack.com/automate/sessions/${sessionId}/networklogs`,
		// 		{
		// 			headers: {
		// 				Authorization: `Basic ${btoa(
		// 					`${process.env.BROWSERSTACK_USERNAME}:${process.env.BROWSERSTACK_ACCESS_KEY}`
		// 				)}`
		// 			}
		// 		}
		// 	);

		// 	const networkLogs = await response.json();
		// 	//console.dir(networkLogs, { depth: null, colors: true });
		// 	const matchingRequests = networkLogs.entries.filter((log) => log.url.includes(REQUEST_PATTERN));
		// 	console.dir(matchingRequests, { depth: null, colors: true });
		// } catch (error) {
		// 	console.log(error);
		// }
	});

	test(
		'NETWORK_LOGS_READING_TEST_' + Date.now(),
		async () => {
			await driver.get('https://esq.elcomspb.ru/');
		},
		10000000
	);

	// test('test dropdown click desktop', async () => {
	// 	await driver.get('https://esq.elcomspb.ru/');
	// 	await driver.findElement(By.css('.dropdown')).click();
	// 	await driver.wait(until.elementLocated(By.css('.dropdown-menu')));
	// }, 100000);
});

//const loadedLogs = [];

// const int = setInterval(async () => {
// 	if (!logPaths.length) return;

// 	const [newLogPath] = logPaths;

// 	try {
// 		const response = await fetch(newLogPath, {
// 			headers: {
// 				Authorization: `Basic ${btoa(
// 					`${process.env.BROWSERSTACK_USERNAME}:${process.env.BROWSERSTACK_ACCESS_KEY}`
// 				)}`
// 			}
// 		});

// 		const result = await response.json();
// 		const logs = result;

// 		loadedLogs.push(logs?.log?.entries);
// 		console.log(...loadedLogs);

// 		if (loadedLogs.length === logPaths.length) clearInterval(int);
// 	} catch (error) {
// 		console.log(error);
// 		//fallback
// 	}
// }, 2500);
