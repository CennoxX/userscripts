// ==UserScript==
// @name        Google tab paths
// @description Use tabs to choose results
// @include     https://www.google.com/*
// @author      CennoxX
// @contact     cesar.bernard@gmx.de
// @homepage    https://twitter.com/CennoxX
// @namespace   https://greasyfork.org/users/21515
// @version     0.8
// @grant       none
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
