/*

    EndPwn3.2 Stage 2 Payload
    
    Copyright 2018 EndPwn Project
    
    Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

    https://github.com/endpwn/

*/

// we just get remote because nothing in the root of the module is useful to us
const electron = require('electron').remote;
const fs = require('original-fs');

const data = electron.app.getPath('userData') + '/';

function bsprint(str) {
    console.log(`%c[bspwn]%c ` + str, 'font-weight:bold;color:#0cc', '');
}

function bswarn(str) {
    console.warn(`%c[bspwn]%c ` + str, 'font-weight:bold;color:#0cc', '');
}

// basically took this one verbatim from epapi bc i couldnt be fucked to reimplement it
function bserror(t, e) {
    console.error(`%c[bspwn]%c ${t}:\n\n`, 'font-weight:bold;color:#0cc', '', e);
}

exports.go = function () {

    // crashing the preload script is very bad and definitely not something we want to do, so we catch our errors
    try {

        bsprint('initializing...');

        if (location.hostname.indexOf('discordapp') == -1) {
            bswarn('hm, not running under discordapp, let\'s abort...');
            return;
        }

        // apparently tripping hasSuspiciousCode() makes discord not report errors, so lets do that on purpose
        window.BetterDiscord = 'this is a dummy value to trip hasSuspiciousCode()';

        // make sure crispr and epapi are actually there before trying to load them
        var crisprFound = fs.existsSync(data + 'crispr.js');
        var epapiFound = fs.existsSync(data + 'epapi.js');

        if (!epapiFound) {
            bswarn('EPAPI not detected, aborting...');
            return;
        }

        if (!crisprFound) bswarn('CRISPR not detected');

        // load our friends :)
        var crispr = require(data + 'crispr.js');
        var epapi = require(data + 'epapi.js');

        // these are the bootstrap properties we pass to crispr and epapi
        var properties = {
            name: 'EndPwn3',
            version: {
                major: 3,
                minor: 2,

                toString: function () {
                    return `v${this.major}.${this.minor}`;
                }
            },
            method: 'bspwn',
            brand: true,
            native: true
        };

        // start crispr
        if (crisprFound) crispr.go(properties);

        // delay epapi until dom-ready to prevent errors
        electron.getCurrentWindow().webContents.on('dom-ready', () => epapi.go(properties));

    }
    catch (ex) {
        bserror('exception during init', ex);
    }

};
