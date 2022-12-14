// ==UserScript==
// @name         Paywall Breaker
// @version      0.4.6
// @description  Removes paywalls from news sites
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Paywall%20Breaker]%20
// @match        https://www.cz.de/*
// @match        https://www.dnn.de/*
// @match        https://www.goettinger-tageblatt.de/*
// @match        https://www.haz.de/*
// @match        https://www.kn-online.de/*
// @match        https://www.ln-online.de/*
// @match        https://www.lvz.de/*
// @match        https://www.maz-online.de/*
// @match        https://www.neuepresse.de/*
// @match        https://www.op-marburg.de/*
// @match        https://www.ostsee-zeitung.de/*
// @match        https://www.paz-online.de/*
// @match        https://www.rnd.de/*
// @match        https://www.rundschau-online.de/*
// @match        https://www.siegener-zeitung.de/*
// @match        https://www.sn-online.de/*
// @match        https://www.waz-online.de/*
// @icon         https://img.icons8.com/ios-glyphs/512/pay-wall.png
// @grant        GM.addStyle
// @license      MIT
// ==/UserScript==
/* jshint esversion: 11 */
/* eslint quotes: ["warn", "double", {"avoidEscape": true}] */
/* eslint curly: "off" */

(async function() {
    "use strict";
    if(location.href.endsWith("?outputType=valid_amp")) {
        location.href = location.href.replace("?outputType=valid_amp","");
    }
    switch (location.hostname) {
        case 'www.cz.de':
            {
                GM.addStyle(".content-subscription-box,.newsletter-signup-wrapper {display:none;}");
                document.querySelector("article").classList.remove("news-read-not-allowed");
                var site = await fetch(location.href);
                var html = await site.text();
                var parser = new DOMParser();
                var htmlDoc = parser.parseFromString(html, "text/html");
                document.querySelector(".field__items").innerHTML = htmlDoc.querySelector(".field__items").innerHTML;
                break;
            }
        case 'www.rnd.de':
            {
                if (document.querySelector('header > div > div > [class^="Textstyled__Text-"]')){
                    GM.addStyle('[class^="ArticleContentLoaderstyled__Gradient-"],article > svg {display:none;}');
                    var article = JSON.parse([...document.querySelectorAll('script[type="application/ld+json"]')].pop().innerHTML).articleBody;
                    document.querySelector('header > div > div > [class^="Textstyled__Text-"]').innerHTML = article;
                    document.querySelector('[class^="ArticleHeadstyled__ArticleTeaserContainer-"]').style.height = "100%";
                }
                break;
            }
        case 'www.rundschau-online.de':
            {
                GM.addStyle(".tm-visible,.dm-slot--desktop {display:none!important;}");
                GM.addStyle(".dm-mural.dm-paint,.dm-mural.dm-paint .dm-figure {filter: initial!important;pointer-events: initial!important;user-select: initial!important;}");
                break;
            }
        default:
            {
                if (document.querySelector('header > div > div > [class^="Textstyled__Text-"]')){
                    GM.addStyle(".h2-pw {font-family: 'DIN Next LT Pro', Arial, Roboto, sans-serif; font-weight:700; letter-spacing:-0.25px; font-size:22px; line-height:26px;}");
                    GM.addStyle(".space-pw {padding-bottom:4px; padding-top:8px;}");
                    GM.addStyle(".location-pw {font-family: Inter,Arial,Roboto,sans-serif; font-size: 16px; font-weight: 600;}");
                    GM.addStyle('[class^="ArticleContentLoaderstyled__Gradient-"],[id^="piano-lightbox-article-"],article > svg {display:none;}');
                    var jsonText = document.querySelector("#fusion-metadata").innerHTML.split(/;Fusion\.globalContent.*?=/)[1];
                    var jsonObj = JSON.parse(jsonText);
                    var elements = jsonObj.elements.filter(i => i.type != "ad");
                    var start = jsonObj?.location != null && jsonObj.location != "" ? `<span class="location-pw">${jsonObj.location}.</span> ` : "";
                    var readAlsoIndex = elements.findIndex(i => i.text?.includes("Lesen Sie auch"));
                    if (readAlsoIndex != -1)
                        elements.splice(readAlsoIndex, 2);
                    var appAdIndex = elements.findIndex(i => i.text?.match(/Laden Sie sich jetzt hier kostenfrei unsere neue .*-App herunter:/));
                    if (appAdIndex != -1)
                        elements.splice(appAdIndex, 3);
                    var articleText = start + elements.map(i => (i.type=="header"?'<h2 class="h2-pw">':"") + (i.text??"") + (i.type == "header"?"</h2>":"") + (i.type == "image"?`<div><img alt="${i.imageInfo?.alt}" src="${i.imageInfo?.src}" width="100%"><div class=""><p class="ClTDP">${i.imageInfo?.caption}</p><p class="bIdZuO">${i.imageInfo?.credit}</p></div></div>`:"") + (i.type == "list"?"<ul>" + i.list?.items?.map(l => "<li>• " + l.text + "</li>").join("") + "</ul>":"")).join('</p><p class="space-pw">');
                    console.log(articleText);
                    document.querySelector('header > div > div > p').innerHTML = articleText;
                    document.querySelector('[class^="ArticleHeadstyled__ArticleTeaserContainer-"]').style.height = "100%";
                }
                break;
            }
    }
})();