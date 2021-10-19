// ==UserScript==
// @name         Google Tasks Desktop
// @version      0.2
// @description  Change the appearance to tasks.google.com
// @author       CennoxX
// @contact      cesar.bernard@gmx.de
// @homepage     https://twitter.com/CennoxX
// @namespace    https://greasyfork.org/users/21515
// @match        https://fullscreen-for-googletasks.com/
// @icon         https://ssl.gstatic.com//tasks/00d84c8baaaf6dd434993369f1441e47/favicon.ico
// @grant        GM.addStyle
// ==/UserScript==
(function() {
    'use strict';
    var favicon = document.querySelector("link[rel~='icon']");
    favicon.href = 'https://ssl.gstatic.com//tasks/00d84c8baaaf6dd434993369f1441e47/favicon.ico';
    GM.addStyle(".sc-fzqLLg,.sc-fznXWL,.hejSGq input,.eQYbes .MuiPaper-root{background-color:White}");
    GM.addStyle(".hejSGq input,.eQYbes .MuiPaper-root{border:1px solid #b1b1b1}");
    setTimeout(()=>{document.querySelector(".sc-fzqLLg>span").innerText = "Google Tasks"},1000);
})();
