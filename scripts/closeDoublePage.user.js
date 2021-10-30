// ==UserScript==
// @name         closeDoublePage
// @version      0.4.1
// @description  Closes the old tab, if a new one with the same URL emerges.
// @author       CennoxX
// @contact      cesar.bernard@gmx.de
// @homepage     https://twitter.com/CennoxX
// @namespace    https://greasyfork.org/users/21515
// @include      *
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        window.close
// @license      MIT
// ==/UserScript==
sessionStorage.setItem('firstTimeOpened',new Date());
GM_setValue('log', document.URL + '##' + sessionStorage.getItem('firstTimeOpened'));
var oldLogs = '';
setInterval(function() {
    var logs = GM_getValue('log');
    if (oldLogs != logs) {
        if (document.URL==logs.split('##')[0] && sessionStorage.getItem('firstTimeOpened') != logs.split('##')[1])
        {
            window.close()
        }
        else
        {
            oldLogs = logs;
        }
    }
}, 500);
