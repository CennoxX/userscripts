// ==UserScript==
// @name         Filmografie von IMDb nach Wikipedia
// @version      3.0.0
// @description  Wandelt die Filmografie von IMDb mithilfe von Wikidata in Wikipedia-Quelltext um
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Filmografie%20von%20IMDb%20nach%20Wikipedia]%20
// @connect      www.wikidata.org
// @connect      www.imdb.com
// @match        https://www.imdb.com/name/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @grant        GM.registerMenuCommand
// @grant        unsafeWindow
// @license      MIT
// @noframes
// ==/UserScript==
/* jshint esversion: 11 */

(function(){
    "use strict";
    var sha256 = {
        loadActor: "4faf04583fbf1fbc7a025e5dffc7abc3486e9a04571898a27a5a1ef59c2965f3",
        loadActress: "0cf092f3616dbc56105327bf09ec9f486d5fc243a1d66eb3bf791fda117c5079",
        loadEpisodeActor: "4cda84f556104467ecebd3c8911671f85c4d8a8f7877d7a95bfa814e2d3da4fc",
        loadEpisodeActress: "5d6728cf6dfa5f1df8b3ead8076d2b61035c7c3dfb0e5b8e2e286a01c9aa5199"
    };
    unsafeWindow.ladeFilmografie = function(showShort = true, episodeLabel = "Folge", showAlert = false){
        setTimeout(async() =>{
            var isMale = document.querySelector(".filmo-section-actor,.filmo-section-actress").classList.contains("filmo-section-actor");
            var imdbId = location.href.split("/")[4];
            var filmography = [];
            var request = 0;
            var done = 0;
            var resp = await fetch(`https://caching.graphql.imdb.com/?operationName=NameMainFilmographyPaginatedCredits&variables={"after":"${btoa("nm0000001/tt0000001/actor")}","id":"${imdbId}","includeUserRating":false,"locale":"en-US"}&extensions={"persistedQuery":{"sha256Hash":"${(isMale ? sha256.loadActor : sha256.loadActress)}","version":1}}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "x-imdb-user-country": "DE"
                }
            });
            var workObj = await resp.json();
            var work = workObj.data.name[(isMale ? "actor_credits" : "actress_credits")].edges.map(i => i.node);
            var checkIfCompleted = setInterval(() => {
                console.clear();
                if ((done / request) != 1){
                    console.log("requests:", done, "/", request);
                } else {
                    var formattedFilmography = "== Filmografie ==";
                    filmography.forEach(entry => {
                        formattedFilmography += entry.toString();
                    });
                    GM.setClipboard(formattedFilmography);
                    var successMessage = "Filmografie wurde erfolgreich kopiert.";
                    if (showAlert){
                        alert(successMessage);
                    } else {
                        console.log(formattedFilmography);
                        console.log(successMessage);
                    }
                    clearInterval(checkIfCompleted);
                }
            }, 1000);

            for(var w of work){
                var credit = new Credit();
                credit.yearFrom = w.episodeCredits.yearRange?.year ?? w.title.releaseYear.year;
                credit.yearTo = w.episodeCredits.yearRange ? w.episodeCredits.yearRange.endYear : 0;
                credit.dt = w.title.titleText.text.replace(" - ", " – ").replace("...", "…");
                credit.ot = w.title.originalTitleText.text.replace(" - ", " – ").replace("...", "…");
                var creditType = w.title.titleType.text;
                if (creditType == "Video Game"){
                    continue;
                }
                credit.type = creditType
                    .replace(/Documentary short/, "Dokumentar-Kurzfilm")
                    .replace(/(TV Movie d|D)ocumentary/, "Dokumentarfilm")
                    .replace(/TV Series short/, "Webserie")
                    .replace(/TV Series( documentary)?/, "Fernsehserie")
                    .replace(/TV Mini Series( documentary)?/, "Miniserie")
                    .replace(/TV Movie/, "Fernsehfilm")
                    .replace(/(Video s|TV S|TV Mini Series s|S)hort/, "Kurzfilm")
                    .replace(/(Movie|Music Video|Video)/, "");
                if (!showShort && credit.type.includes("Kurzfilm")){
                    continue;
                }
                credit.imdbid = w.title.id;
                credit.voice = w.attributes?.[0].text == "voice";
                if (credit.voice && w.characters?.[0].name){
                    credit.voice = w.characters?.[0].name;
                }
                filmography.push(credit);
                getItemFromWikidata(credit.imdbid);
                if (credit.type.includes("serie")){
                    credit.numberOfEpisodes = w.episodeCredits.total;
                    request++;
                    resp = await fetch(`https://caching.graphql.imdb.com/?operationName=EpisodeBottomSheetCast&variables={"after":"","episodeCreditsFilter":{},"locale":"de-DE","nameId":"${imdbId}","titleId":"${credit.imdbid}"}&extensions={"persistedQuery":{"sha256Hash":"${(isMale ? sha256.loadEpisodeActor : sha256.loadEpisodeActress)}","version":1}}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "x-imdb-user-country": "DE"
                        }
                    });
                    var epData = await resp.json();
                    done++;
                    var ep = epData.data.name.credits.edges[0]?.node;
                    if (ep){
                        credit.numberOfEpisodes = ep.episodeCredits.edges.filter(i => i.node.attributes?.[0]?.text != "credit only").length;
                        if (credit.numberOfEpisodes == 1){
                            var epCredit = ep.episodeCredits.edges[0].node.title;
                            credit.episodeid = epCredit.id;
                            if (epCredit.series.displayableEpisodeNumber.episodeNumber.text != "unknown")
                                credit.episodeName = (epCredit.series.displayableEpisodeNumber.displayableSeason.text + "x" + epCredit.series.displayableEpisodeNumber.episodeNumber.text).replace(/x(\d)$/,"x0$1");
                            getItemFromWikidata(credit.episodeid);
                        } else {
                            credit.episodeName = "";
                        }
                    }
                }
            }

            filmography = filmography.reverse().sort((a,b) => {
                return a.yearFrom - b.yearFrom;
            });

            function getItemFromWikidata(imdbid){
                request++;
                GM.xmlHttpRequest({
                    method: "GET",
                    url: "https://www.wikidata.org/w/api.php?action=query&format=json&list=search&srsearch=haswbstatement:P345=" + imdbid,
                    onload: function(response){
                        done++;
                        if (response.responseText.length > 0){
                            var jsonObj = JSON.parse(response.responseText);
                            var credit = filmography.find(c => {
                                return c.imdbid == imdbid || c.episodeid == imdbid;
                            });
                            if (jsonObj.query.searchinfo.totalhits > 0){
                                var wikidataid = jsonObj.query.search[0].title;
                                if (credit.imdbid == imdbid){
                                    credit.link = wikidataid;
                                } else {
                                    credit.episodeid = wikidataid;
                                }
                                getDataFromWikidata(wikidataid);
                            }
                        }
                    },
                    onerror: function(response){
                        done++;
                        console.log("Error in fetching contents: " + response.responseText);
                    }
                });
            }

            function getDataFromWikidata(wikidataid){
                request++;
                GM.xmlHttpRequest({
                    method: "GET",
                    url: "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|claims|labels&sitefilter=dewiki&ids=" + wikidataid,
                    onload: function(response){
                        done++;
                        if (response.responseText.length > 0){
                            var jsonObj = Object.values(JSON.parse(response.responseText).entities)[0];
                            var credit = filmography.find(c => {
                                return c.link == wikidataid || c.episodeid == wikidataid;
                            });
                            if (credit.link == wikidataid){ //get dt, ot, link
                                if (typeof jsonObj.sitelinks.dewiki != "undefined"){ //wikipedia article
                                    credit.link = jsonObj.sitelinks.dewiki.title;
                                } else {
                                    credit.link = "";
                                }
                                if (typeof jsonObj.labels.de != "undefined"){ //wikidata label
                                    credit.dt = jsonObj.labels.de.value;
                                }
                                if (typeof jsonObj.claims.P1476 != "undefined"){ //check if OT of entity exists
                                    credit.ot = jsonObj.claims.P1476[0].mainsnak.datavalue.value.text.replace(/'/g, "’");
                                }
                            } else if (credit.episodeid == wikidataid){ //get episode name
                                if (typeof jsonObj.sitelinks.dewiki != "undefined"){ //wikipedia article
                                    var article = jsonObj.sitelinks.dewiki.title;
                                    if (article.slice(-1) == ")"){
                                        article += `|${article.split(" (")[0]}`;
                                    }
                                    credit.episodeName += ` ''[[${article}]]''`;
                                } else if (typeof jsonObj.labels.de != "undefined"){ //wikidata label
                                    credit.episodeName += ` ''${jsonObj.labels.de.value}''`;
                                }
                            }
                        }
                    },
                    onerror: function(response){
                        done++;
                        console.log("Error in fetching contents: " + response.responseText);
                    }
                });
            }

            function Credit(){
                this.numberOfEpisodes = 0;
                this.episodeid = "";
                this.formatTitle = function(title = ""){
                    return title.replace(/[-–:., \d’'!]/g, "").toLowerCase();
                };
                this.compareTitles = function(titleA,titleB){
                    return this.formatTitle(titleA) == this.formatTitle(titleB);
                };
                this.getYearPart = function(){
                    var currentYear = new Date().getFullYear();
                    if (this.type.includes("serie") && this.numberOfEpisodes > 1 && (this.yearFrom == currentYear || (this.yearTo && this.yearTo == currentYear))){
                        return `seit ${this.yearFrom}`;
                    }
                    if (!this.yearTo || this.yearTo == this.yearFrom){
                        return this.yearFrom;
                    }
                    if (this.numberOfEpisodes == 2 && parseInt(this.yearFrom) + 1 != this.yearTo){
                        return `${this.yearFrom}, ${this.yearTo}`;
                    }
                    return `${this.yearFrom}–${this.yearTo}`;
                };
                this.getTitlePart = function(){
                    if (!this.link){
                        return this.dt;
                    }
                    if (this.link.slice(-1) == ")"){
                        this.dt = this.link.split(" (")[0];
                        return `[[${this.link}|${this.dt}]]`;
                    }
                    this.dt = this.link;
                    return `[[${this.link}]]`;
                };
                this.getDescriptionPart = function(){
                    if (!this.compareTitles(this.ot, this.dt) && !this.type && !this.voice){
                        return ` ''(${this.ot})''`;
                    }
                    var descriptionPart = "";
                    if (!this.compareTitles(this.ot, this.dt)){
                        descriptionPart += ` (''${this.ot}''`;
                    }
                    if (this.type){
                        descriptionPart += (descriptionPart ? ", " : " (") + this.type;
                    }
                    if (!`${this.getYearPart()}`.startsWith("seit")){
                        if (this.numberOfEpisodes > 1){
                            descriptionPart += `, ${this.numberOfEpisodes} ${episodeLabel}n`;
                        } else if (this.numberOfEpisodes && this.episodeName){
                            descriptionPart += `, ${episodeLabel} ${this.episodeName}`;
                        } else if (this.numberOfEpisodes){
                            descriptionPart += `, eine ${episodeLabel}`;
                        }
                    }
                    if (this.voice){
                        if (typeof this.voice == "string"){
                            descriptionPart += (descriptionPart ? ", " : " (") + "Stimme von ''" + this.voice + "''";
                        }else{
                            descriptionPart += (descriptionPart ? ", " : " (") + "Sprechrolle";
                        }
                    }
                    descriptionPart += descriptionPart ? ")" : "";
                    return descriptionPart;
                };
                this.toString = function(){
                    return `\n* ${this.getYearPart()}: ${this.getTitlePart()}${this.getDescriptionPart()}`;
                };
            }
        }, 0);
        return "Filmografie lädt …";
    };

    GM.registerMenuCommand("Filmografie laden",() => {
        unsafeWindow.ladeFilmografie(undefined, undefined, true);
    },"f");
    console.log('Um die Filmografie mit Standardeinstellungen zu laden, genügt ein Klick im Menü des Userscripts auf "Filmografie laden".\n' +
                'Die Filmografie kann in der Console mit erweiterten Einstellungen in der Form "ladeFilmografie(occupation, showShort, episodeLabel);" aufgerufen werden.\n' +
                'Dabei steht "episodeLabel" für die verwendete Bezeichnung "Folge" oder "Episode" und "showShort" dafür, ob Kurzfilme aufgeführt werden sollen oder nicht (true oder false).\n' +
                'Mit "occupation" können andere Filmografien als Schauspiel-Filmografien ausgegeben werden, dazu ist zum Beispiel "writer", "director" oder "producer" anzugeben.');
})();
