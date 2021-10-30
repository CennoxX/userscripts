// ==UserScript==
// @name         Google tab paths
// @version      0.7.1
// @description  Use tabs to choose results
// @author       CennoxX
// @contact      cesar.bernard@gmx.de
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @downloadURL  https://greasyfork.org/scripts/389426-google-tab-paths/code/Google%20tab%20paths.user.js
// @updateURL    https://greasyfork.org/scripts/389426-google-tab-paths/code/Google%20tab%20paths.meta.js
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Google%20tab%20paths]%20
// @include      https://www.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @license      MIT
// ==/UserScript==

var result = document.querySelectorAll('.yuRUbf>a');
for (var i = 0; i < result.length; i++) {
    result[i].tabIndex = i+1;
}
document.querySelector('[role="link"]').tabIndex = -1;
document.querySelector('[role="link"]').nextElementSibling.tabIndex = -1;
document.querySelector('[role="link"]').nextElementSibling.nextElementSibling.childNodes[2].tabIndex = -1;
var nextLink = document.querySelector('#pnnext');
if (nextLink){
    nextLink.tabIndex = i + 2;
}
