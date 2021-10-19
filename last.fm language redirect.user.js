// ==UserScript==
// @name         last.fm language redirect
// @author       CennoxX
// @contact      cesar.bernard@gmx.de
// @namespace    https://greasyfork.org/users/21515
// @description  Redirects to the page of the own language
// @license      MIT
// @version      0.1
// @match        https://www.last.fm/*
// @run-at       document-start
// @grant        none
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
