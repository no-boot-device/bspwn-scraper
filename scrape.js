#!/usr/bin/node --expose-gc

const fetch = require('node-fetch');
const request = require('request');
const fs = require('fs');
const ncp = require('ncp');
const asar = require('asar');
const archiver = require('archiver');
const exec = require('child_process').exec;

const branches = ['canary', 'ptb', 'stable'];
const platforms = ['win', 'linux', 'osx'];

console.log('loading config...');
var config = fs.existsSync('config.json') ?
    JSON.parse(fs.readFileSync('config.json').toString()) :
    {};

var lastver = {};

function patch(target, resolve) {

    console.log('extracting zip...');
    if (!fs.existsSync(target)) fs.mkdirSync(target);
    console.log(`unzip -o ${target}.orig.zip -d ${target}`);
    var child = exec(`unzip -o ${target}.orig.zip -d ${target}`);
    child.stdout.pipe(process.stdout);
    child.on('exit', () => {

        path = target + '/core';

        console.log('extracting asar...');
        asar.extractAll(path + '.asar', path);

        console.log('patching mainScreen.js...');
        var mainScreen = fs.readFileSync(path + '/app/mainScreen.js').toString();
        mainScreen = mainScreen
            .replace(/nodeIntegration: false,/, 'nodeIntegration: true,')
            .replace(/mainWindow\.loadURL\(URL_TO_LOAD\);/, "mainWindow.loadURL(_url.format({ pathname: _path2.default.join(__dirname, 'bspwn/updater.html'), protocol: 'file:', slashes: true }));");
        fs.writeFileSync(path + '/app/mainScreen.js', mainScreen);

        console.log('patching mainScreenPreload.js...');
        var mainScreenPreload = fs.readFileSync(path + '/app/mainScreenPreload.js').toString();
        mainScreenPreload = mainScreenPreload
            .replace(/var electron = require\('electron'\);/, "var bspwn = require('./bspwn');\nbspwn.go();\nvar electron = require('electron');");
        fs.writeFileSync(path + '/app/mainScreenPreload.js', mainScreenPreload);

        console.log('copying bspwn files...')
        ncp.ncp(__dirname + '/bspwn', path + '/app/bspwn', () => {

            console.log('zipping it all up...');
            var archive = archiver('zip');

            var output = fs.createWriteStream((config.target || './') + target + '.zip');

            archive.pipe(output);
            archive.directory(path, 'core');
            archive.file(__dirname + '/files/index.js', { name: 'index.js' });
            archive.file(target + '/package.json', { name: 'package.json' });
            archive.finalize();

            //output.close(resolve);
            resolve();

        });

    });

}

async function scrape() {

    console.log('scraping...');

    try {

        for (b in branches) {

            var branch = branches[b];

            for (p in platforms) {

                await new Promise(async (resolve, reject) => {

                    var platform = platforms[p];

                    var ident = `${branch}-${platform}`;

                    var currentver = await fetch(`https://discordapp.com/api/updates/${branch}?platform=${platform}`);
                    currentver = await currentver.json();
                    currentver = currentver.name;

                    var modules = await fetch(`https://discordapp.com/api/modules/${branch}/versions.json?platform=${platform}&host_version=${currentver}`);
                    modules = await modules.json();

                    var verstring = `${currentver}-${modules.discord_desktop_core}`;

                    console.log(`${ident} ${verstring}`);

                    if (!lastver[ident] || verstring > lastver[ident]) {
                        console.log('update available, fetching...');
                        lastver[ident] = verstring;
                        var target = `https://discordapp.com/api/modules/${branch}/discord_desktop_core/${modules.discord_desktop_core}?platform=${platform}&host_version=${currentver}`;
                        console.log(target);

                        request({
                            followAllRedirects: true,
                            url: target,
                            encoding: null
                        }, (err, response, body) => {
                            fs.writeFile(ident + '.orig.zip', body, () => {
                                console.log('done downloading');
                                patch(ident, resolve);
                            })
                        });
                    }
                    else resolve();

                });

            }

        }

    }
    catch (ex) {
        console.log(ex);
    }

    console.log('scraping again in 15 minutes');
    global.gc();

}

setInterval(scrape, 15 * 60 * 1000);
//setInterval(scrape, 60*1000);
scrape();
