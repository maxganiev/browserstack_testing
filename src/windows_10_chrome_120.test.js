const { Builder, By, until } = require('selenium-webdriver');

const capabilities = {
	'bstack:options': {
		os: 'Windows',
		osVersion: '11',
		browserVersion: 'latest',
		projectName: 'My Project',
		buildName: 'Build 1.0',
		sessionName: 'Test Session',
		userName: process.env.BROWSERSTACK_USER,
		accessKey: process.env.BROWSERSTACK_KEY
	},
	'browserName': 'Chrome'
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

		await driver.quit();

		console.log({ browser_stack_session_id: sessionId });
	});

	test(
		'NETWORK_LOGS_READING_TEST_' + Date.now(),
		async () => {
			await driver.get('https://esq.elcomspb.ru/');
		},
		10000000
	);
});
