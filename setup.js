import "./addRequire.js";
import { readToken, delay } from "./utils/file.js";
import { banner } from './utils/banner.js';
import { logger } from './utils/logger.js';
import fetch from 'node-fetch';
import readline from 'readline';
import fs from 'fs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import axios from 'axios';
const flatted = require('flatted');
const util = require('util');
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});
const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'origin': 'https://app.meshchain.ai',
    'referer': 'https://app.meshchain.ai/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' // Optional, if required by API
};
const getAccounts = () => {
	return fs.readFileSync('accounts.txt', 'utf8').split('\n').map(line => line.trim()).filter(Boolean);
};

const askQuestion = (query) => {
	return new Promise((resolve) => rl.question(query, resolve));
};
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}



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

const loginUser = async (email, password,proxy) => {
	const maxRetries = 1;
	let attempt = 0;
	await sleep(2000);
	while (attempt < maxRetries) {
		try {
			const agent = proxy ? new HttpsProxyAgent(proxy) : null;  // Only use proxy if provided

        // Set up Axios request options
			const options = {
				headers,
				httpsAgent: agent,  // Attach the proxy agent if available
			};
			const loginPayload = { username: email, password };
			const loginResponse = await axios.post('https://api.openloop.so/users/login', 
			JSON.stringify(loginPayload),options
			);
			//logger(`Login successful! Response data: ${util.inspect(loginResponse, { depth: 1 })}`, 'success');
			

			if (loginResponse.status != 200) {
				//logger(`Login successful! Response data: ${util.inspect(loginResponse, { depth: 2 })}`, 'success');
				//logger(`Login data for ${JSON.stringify(loginResponse, null, 2)}`, 'success'); 
				throw new Error(`=========Login failed! Status: ${loginResponse.status}\n`);
			}

			
			const accessToken = loginResponse.data.data.accessToken;
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
			logger(`Login attempt ${attempt} failed for email====: ${email}. Error: ${error.message}\n`, 'error');

			if (attempt >= maxRetries) {
				logger(`Max retries reached for login. Aborting...`, 'error');
				return;
			}

			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}
};



async function manageMailAndRegister() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {

        const accounts = await readToken("accounts.txt");
        const proxies = await readToken("proxy.txt");


        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            var acc = account.toString().split(":");
            const email = acc[0];
            const password = acc[1];
            const proxy = proxies[i];
            var names = email.toString().split("@");
            const name = names[0];
            //console.log("name is: ", name);
            console.log("email is: ", email);
            //console.log("password is: ", password);
            await delay(2000);

            const referralCode = "DJNMDUID1PL5";//await rl.question('Use my referral code? (y/N): ');
            try {

				await loginUser(email,password,proxy);
                logger(`login account #${i + 1} - Email: ${email}`, 'debug');
               

            } catch (error) {
                logger(`Error with account #${i + 1}: ${error.message}`, 'error');
            }
        }
    } catch (error) {
        logger(`Error: ${error.message}`, 'error');
    } finally {
        rl.close();
    }
}

manageMailAndRegister();