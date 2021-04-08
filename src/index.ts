import * as fs from 'fs';
import * as _ from 'lodash';
import * as admin from 'firebase-admin';
const { launch, getStream } = require('puppeteer-stream');
const serviceAccount = require('../serviceAccountKey.json');

(async () => {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount.firebase),
            storageBucket: 'bulbasaur-bfb64.appspot.com'
        });

        const browser = await launch({
            // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' - M1
            executablePath: '/usr/bin/chromium-browser'
        });
        
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(0); 
        await page.goto('https://player.siriusxm.com/login');

        await page.type('#username', serviceAccount.sirius.email);
        await page.type('#password', serviceAccount.sirius.password);

        await page.click('.login-button');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        await page.goto('https://player.siriusxm.com/favorites/shows');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitForTimeout(500);

        await page.click('.tile-wrapper');
        await page.waitForTimeout(500);

        await page.click('.tile-list__item:nth-child(1) button.center-column');
        await page.waitForTimeout(500);

        await page.click('.play-pause-btn');

        const title = await page.$eval('.info-container__title span', el => el.innerText);

        const file = fs.createWriteStream(`./outputs/${encodeURIComponent(title)}.webm`);
        const stream = await getStream(page, { audio: true, video: false, mimeType: 'audio/webm' });

        stream.pipe(file);

        console.log('recording');

        await new Promise((resolve, _reject) => {
            let progress = 0;
            const progressbar = setInterval(async () => {
                const width = await page.$eval('#current-listening-position', el => el.getAttribute('style'));
                progress = _.chain(width).split('width: ', 2).last().replace('%;', '').toNumber().round().value();

                if (progress === 100) {
                    await stream.destroy();
                    file.close();
                    clearInterval(progressbar);
                    return resolve('success');
                }
            }, 1000);
        });

        await admin.storage().bucket().upload(`./outputs/${encodeURIComponent(title)}.webm`, {
            destination: `articuno/${encodeURIComponent(title)}.webm`, metadata: {
                contentType: 'audio/webm'
            },
            public: true,
            validation: 'md5'
        });

        console.log('finished');

        // Close the browser, we no longer need it
        await browser.close();

    } catch (e) {
        console.log(e);
    }
})();