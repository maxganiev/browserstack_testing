const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * @typedef {{name: string; sessionId: string; logPath: string; logs: {testName?: string; testSessionId?: string; filtered?: string[]; count?: number; passed?: boolean;}}} Test
 * @typedef {{page_ref: string; startedDateTime: string; time: number; request: {url: string;}}} Log
 * */

const TestsCommand = (function () {
	//!Global state
	//Share state memory for ALL INCOMING requests
	/**
	 * @private
	 * @type {{testsCount: number; currentTest: string?; pendingTests: string[]; executingTests: Test[]; completedTests: Test[]; isRunning: boolean; resetState: Function }}
	 * */
	const testState = {
		testsCount: 0,
		currentTest: null,
		pendingTests: [],
		executingTests: [],
		completedTests: [],
		isRunning: false,

		resetState() {
			this.testsCount = 0;
			this.currentTest = null;
			this.pendingTests = [];
			this.executingTests = [];
			this.completedTests = [];
			this.isRunning = false;
		}
	};

	//#region Constants
	/**@private */
	const LOG_FILE_PATH = '../test-results/';

	/**@private */
	const RESPONSE_MESSAGES = {
		NO_TESTS: 'No active tests running',
		TEST_FAIL: 'Something went wrong',
		TEST_STARTED: (test) => `Test ${_testFileName(test)} has been started`,
		TEST_IN_PROGRESS: (test) => `Test ${_testFileName(test)} is in progress`,
		TEST_COMPLETED: (test) => `${test} completed`,
		LOG_LOAD_IN_PROGRESS: 'File load is in progress...',
		ALL_TESTS_COMPLETED: 'All tests completed.'
	};
	//#endregion

	//#region Helpers
	/**
	 * @private
	 * @param {string} testName
	 * @returns {string}
	 */
	function _testFileName(testName) {
		return testName;
	}

	/**
	 * @private
	 * @param {string} sessionId
	 * @returns {string}
	 */

	function _logPath(sessionId) {
		return `https://api.browserstack.com/automate/sessions/${sessionId}/networklogs`;
	}
	//#endregion

	/**
	 *
	 * @param {string[]} testsPaths
	 * @returns {void}
	 */
	function runTests(testsPaths = []) {
		try {
			if (!testsPaths) {
				console.log(RESPONSE_MESSAGES.NO_TESTS);
				return;
			}

			if (!testState.pendingTests.length && !testState.isRunning) {
				testState.pendingTests = [...testsPaths];
				testState.testsCount = testsPaths.length;
			}

			if (testState.isRunning) {
				console.log(RESPONSE_MESSAGES.TEST_IN_PROGRESS(testState.currentTest));
				return;
			}

			if (testState.pendingTests.length) {
				testState.isRunning = true;
				testState.currentTest = testState.pendingTests[0];
				testState.executingTests.push({
					name: testState.currentTest,
					sessionId: undefined,
					logPath: undefined,
					logs: {}
				});

				console.log(RESPONSE_MESSAGES.TEST_STARTED(testState.currentTest));
			}

			const command = `browserstack-node-sdk jest ${testState.currentTest}`;
			const childProcess = exec(command, {
				cwd: path.join(__dirname, '..'),
				env: { ...process.env }
			});

			//On browserstack processing
			childProcess.stdout.on('data', (data) => {
				const sessionId = data.match(/browser_stack_session_id:\s*'([^']+)'/)?.[1];
				if (sessionId) {
					const testExecuting = testState.executingTests[0];
					testExecuting.sessionId = sessionId;
				}
			});

			//On browserstack process end
			childProcess.on('close', (code) => {
				const processedTest = testState.pendingTests.shift();
				const testExecuting = testState.executingTests[0];
				testExecuting.logPath = _logPath(testExecuting.sessionId);

				testState.isRunning = false;
				testState.currentTest = null;

				_getTestLogFile();

				console.log('testState in close clause of runTests', testState);
				console.log(`Test ${processedTest} processed with code ${code}`);

				if (testState.pendingTests.length > 0) setImmediate(runTests);
			});
		} catch (error) {
			console.dir(error, { colors: true, depth: true });
		}
	}

	/**
	 * @private
	 * @desc Create paralell context to resolve file of logs
	 * and perform logs checking accordingly. No need to be awaited as
	 * executed in the background.
	 * */
	function _getTestLogFile() {
		let attemps = 0;
		const AV_TESTING_COUNT_MS = 150000;
		const LOG_FETCH_TIMEOUT_MS = 2500;
		const MAX_ATTEMPT_COUNT = AV_TESTING_COUNT_MS / LOG_FETCH_TIMEOUT_MS;

		if (!testState.executingTests.length) return;
		let testExecuting = testState.executingTests.shift();

		//console.log('testExecuting in _getTestLogFile', testExecuting);

		const int = setInterval(async () => {
			if (attemps >= MAX_ATTEMPT_COUNT) {
				console.log(RESPONSE_MESSAGES.TEST_FAIL);
				clearInterval(int);
			}

			if (!testExecuting) clearInterval(int);

			attemps++;

			try {
				const response = await fetch(testExecuting.logPath, {
					headers: {
						Authorization: `Basic ${Buffer.from(
							`${process.env.BROWSERSTACK_USERNAME}:${process.env.BROWSERSTACK_ACCESS_KEY}`
						).toString('base64')}`
					}
				});

				//throws exception if page of logs has not yet been created
				const json = await response.json();

				//Clear interval and perform logs validation only if json was
				//resolved successfully
				clearInterval(int);
				_validateMetrics(json.log.entries, testExecuting);
			} catch (error) {
				console.log(RESPONSE_MESSAGES.LOG_LOAD_IN_PROGRESS);
				//fallback
			}
		}, LOG_FETCH_TIMEOUT_MS);
	}

	/**
	 *
	 * @param {{page_ref: string; startedDateTime: string; time: number; request: {url: string;}}[]} logs
	 * @param {Test} testExecuting
	 */
	function _validateMetrics(logs, testExecuting) {
		const VALIDATION_RULES = {
			COMMON: { PATTERN: 'https://esq.elcomspb.ru/assets/', EXPECTED_COUNT: 41 }
		};

		testExecuting.logs = (() => {
			const filteredByPattern = logs
				.filter((log) => log.request.url.includes(VALIDATION_RULES.COMMON.PATTERN))
				.map((item) => item.request.url);

			return {
				testName: testExecuting.name,
				testSessionId: testExecuting.sessionId,
				filtered: filteredByPattern,
				count: filteredByPattern.length,
				passed: filteredByPattern.length === VALIDATION_RULES.COMMON.EXPECTED_COUNT
			};
		})();

		console.log('testState in _validateMetrics', testState);

		_writeResults(testExecuting);
	}

	/**
	 * @private
	 * @param {Test} testExecuting
	 * @desc Write test results to local machine
	 * */
	function _writeResults(testExecuting) {
		try {
			const resultsPath = path.join(__dirname, LOG_FILE_PATH + Date.now() + '.json');

			fs.writeFileSync(
				resultsPath,
				JSON.stringify(
					{
						metadata: {
							logPath: testExecuting.logPath,
							timestamp: new Date().toISOString(),
							source: 'BrowserStack'
						},
						data: testExecuting.logs
					},
					null,
					2
				)
			);
		} catch (error) {
			console.log(error);
		}
		testState.completedTests.push(testExecuting);

		_completeTests();
	}

	/**@private */
	function _completeTests() {
		if (testState.completedTests.length !== testState.testsCount) return;
		testState.resetState();
		console.log(RESPONSE_MESSAGES.ALL_TESTS_COMPLETED);
	}

	return Object.freeze({
		runTests
	});
})();

module.exports = TestsCommand;
