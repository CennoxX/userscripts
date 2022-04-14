// ==UserScript==
// @name         Google tab paths
// @version      0.7.2
// @description  Use tabs to choose the Google search results
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Google%20tab%20paths]%20
// @match        https://www.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=google.com
// @grant        none
// @license      MIT
// ==/UserScript==
/* jshint esversion: 10 */
/* eslint quotes: ['warn', 'single', {'avoidEscape': true}] */
/* eslint curly: 'off' */

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
