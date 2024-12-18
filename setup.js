import "./addRequire.js";
import { banner } from './utils/banner.js';
import { logger } from './utils/logger.js';
import fetch from 'node-fetch';
import readline from 'readline';
import fs from 'fs';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const getAccounts = () => {
	return fs.readFileSync('accounts.txt', 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
};

const askQuestion = (query) => {
	return new Promise((resolve) => rl.question(query, resolve));
};
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const loginUser = async (email, password) => {
	const maxRetries = 1;
	let attempt = 0;
	await sleep(2000);
	while (attempt < maxRetries) {
		try {
			const loginPayload = { username: email, password };
			const loginResponse = await fetch('https://api.openloop.so/users/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(loginPayload),
			});

			if (!loginResponse.ok) {
				throw new Error(`Login failed! Status: ${loginResponse.status}`);
			}

			const loginData = await loginResponse.json();
			const accessToken = loginData.data.accessToken;
			const fs_token = require('fs').promises; // Use the 'promises' API for async file operations
			logger('Login successful get Token:', 'success', accessToken);
			try {
				await fs_token.appendFile(
					'token.txt',
					`${accessToken}\n`,
					'utf-8'
				);
			} catch (err) {
				logger('Failed to save data to reg_success.txt:', "error", err.message);
			}
			logger('Access token saved to token.txt', email, "success");
			return;
		} catch (error) {
			attempt++;
			logger(`Login attempt ${attempt} failed for email: ${email}. Error: ${error.message}`, 'error');

			if (attempt >= maxRetries) {
				logger(`Max retries reached for login. Aborting...`, 'error');
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
};


const registerUser = async (email, password) => {
	const maxRetries = 5;
	let attempt = 0;
	await sleep(2000);
	//const test = await askQuestion('Enter your email: ');
	//const password = await askQuestion('Enter your password: ');

	if (!email || !password) {
		logger('Both email and password are required.', 'error');
		return;
	}
	//console.log("email is : ", email);
	//console.log("password is :",password);
	while (attempt < maxRetries) {
		try {
			const inviteCode = 'ol053ea401';
			const registrationPayload = { name: email, username: email, password, inviteCode };

			const registerResponse = await fetch('https://api.openloop.so/users/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(registrationPayload),
			});
			if (registerResponse.status === 401) {
				logger('Email already exists. Attempting to login...');
				//			console.log('Email already exists. Attempting to login...');
				await loginUser(email, password);
				return;
			}

			if (!registerResponse.ok) {
				throw new Error(`Registration failed! Status: ${registerResponse.status}`);
			}

			const registerData = await registerResponse.json();
			logger('Registration successful:', 'success', registerData.message);

			await loginUser(email, password);
			return;
		} catch (error) {
			attempt++;
			logger(`Attempt ${attempt} failed. Error: ${error.message}`, 'error');

			if (attempt >= maxRetries) {
				logger('Max retries reached for registration/login. Aborting...', 'error');
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

};
const accounts = getAccounts();//jeff add
for (let i = 0; i < accounts.length; i++) {
	const account = accounts[i];
	var acc = account.toString().split(":");
	const email = acc[0];
	const password = acc[1];
	console.log("email is : ", email);
	console.log("password is :", password);
	console.log("for iiiiiiiiiiiiiiiiiiiiiiii", String(i));
	//registerUser(email,password);
	loginUser(email, password);
}//jeffadd


