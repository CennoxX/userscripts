// ==UserScript==
// @name         last.fm language redirect
// @version      0.1.1
// @description  Redirects to the page of the own language
// @author       CennoxX
// @contact      cesar.bernard@gmx.de
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @downloadURL  https://greasyfork.org/scripts/385900-last-fm-language-redirect/code/lastfm%20language%20redirect.user.js
// @updateURL    https://greasyfork.org/scripts/385900-last-fm-language-redirect/code/lastfm%20language%20redirect.meta.js
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Last.fm%20language%20redirect]%20
// @match        https://www.last.fm/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=last.fm
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    var userLang = navigator.language.split('-')[0];
    var availableLangs = /\b(de|es|fr|it|ja|pl|pt|ru|sv|tr|zh|en)\b/;
    if (availableLangs.test(userLang)){
        var pageLang = document.URL.split('/')[3];
        if (userLang!=pageLang)
        {
            window.location.replace("https://www.last.fm/" + userLang + document.URL.substr(availableLangs.test(pageLang)?22:19));
        }
    }
})();
